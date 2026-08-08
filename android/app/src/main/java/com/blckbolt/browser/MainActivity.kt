package com.blckbolt.browser

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.KeyEvent
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.view.inputmethod.EditorInfo
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebSettingsCompat
import com.blckbolt.browser.databinding.ActivityMainBinding
import java.io.IOException
import java.net.URISyntaxException
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var webView: WebView

    private var httpFallbackUrl: String? = null
    private var showingErrorPage = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        webView = binding.webView
        configureWebView()
        wireUi()

        if (savedInstanceState == null) {
            showHomePage()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.setSupportMultipleWindows(false)
        settings.loadsImagesAutomatically = true
        settings.mediaPlaybackRequiresUserGesture = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.allowFileAccessFromFileURLs = false
        settings.allowUniversalAccessFromFileURLs = false
        settings.setGeolocationEnabled(false)
        settings.setSaveFormData(false)
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        try {
            WebSettingsCompat.setSafeBrowsingEnabled(settings, true)
        } catch (_: Exception) {
            // Safe Browsing is only available on API 26+
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                if (!isInternalPage(url)) {
                    showingErrorPage = false
                    binding.urlBar.setText(url)
                }
                binding.progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView, url: String) {
                if (!isInternalPage(url)) {
                    binding.urlBar.setText(url)
                }
                binding.progressBar.visibility = View.GONE
                syncNavButtons()
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return handleExternalScheme(request.url)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (!request.isForMainFrame) return
                val fallback = httpFallbackUrl
                if (fallback != null) {
                    // HTTPS-first upgrade failed; retry the original http URL.
                    httpFallbackUrl = null
                    webView.loadUrl(fallback)
                    return
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    showErrorPage(error.description.toString())
                } else {
                    showErrorPage("Unknown network error")
                }
            }

            override fun onReceivedSslError(
                view: WebView,
                handler: android.webkit.SslErrorHandler,
                error: android.net.http.SslError
            ) {
                handler.cancel()
                Toast.makeText(this@MainActivity, R.string.ssl_blocked, Toast.LENGTH_LONG).show()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                binding.progressBar.progress = newProgress
            }
        }

        webView.setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            try {
                val request = DownloadManager.Request(Uri.parse(url))
                    .setMimeType(mimeType)
                    .addRequestHeader("User-Agent", userAgent)
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimeType)
                    )
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(this, R.string.download_started, Toast.LENGTH_SHORT).show()
            } catch (_: Exception) {
                Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun wireUi() {
        binding.urlBar.setOnEditorActionListener { v, actionId, event ->
            if (actionId == EditorInfo.IME_ACTION_GO ||
                (event != null && event.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)
            ) {
                navigate(binding.urlBar.text?.toString().orEmpty())
                binding.urlBar.clearFocus()
                hideKeyboard()
                true
            } else {
                false
            }
        }

        binding.btnBack.setOnClickListener {
            if (webView.canGoBack()) webView.goBack() else showHomePage()
        }
        binding.btnForward.setOnClickListener {
            if (webView.canGoForward()) webView.goForward()
        }
        binding.btnHome.setOnClickListener { showHomePage() }
        binding.btnRefresh.setOnClickListener { webView.reload() }

        binding.urlBar.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) binding.urlBar.selectAll()
        }
    }

    private fun navigate(rawInput: String) {
        val normalized = normalizeUrl(rawInput)
        if (normalized == HOME_URL) {
            showHomePage()
            return
        }
        if (normalized.startsWith("http://")) {
            httpFallbackUrl = normalized
            webView.loadUrl("https://" + normalized.removePrefix("http://"))
        } else {
            httpFallbackUrl = null
            webView.loadUrl(normalized)
        }
    }

    private fun normalizeUrl(input: String): String {
        var url = input.trim()
        if (url.isEmpty()) return HOME_URL
        val lower = url.lowercase(Locale.US)
        if (lower.startsWith("http://") || lower.startsWith("https://") ||
            lower.startsWith("about:") || lower.startsWith("file:")
        ) {
            return url
        }
        if (lower.startsWith("javascript:") || lower.startsWith("vbscript:")) {
            return HOME_URL
        }
        if (url.contains(" ") || !url.contains(".") || url.endsWith(".")) {
            // Looks like a search query.
            return "https://duckduckgo.com/?q=" + Uri.encode(url)
        }
        return "https://$url"
    }

    /** Returns true when the request was handled (external app), false to load in WebView. */
    private fun handleExternalScheme(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase(Locale.US) ?: return false
        when (scheme) {
            "http", "https", "about", "data", "blob" -> return false
            "intent" -> {
                try {
                    val intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    if (intent.resolveActivity(packageManager) != null) {
                        startActivity(intent)
                    }
                } catch (_: URISyntaxException) {
                }
                return true
            }
            "mailto", "tel", "sms", "geo", "market", "maps" -> {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, uri)
                    if (intent.resolveActivity(packageManager) != null) {
                        startActivity(intent)
                    }
                } catch (_: Exception) {
                }
                return true
            }
            else -> return true // Swallow unknown schemes.
        }
    }

    private fun isInternalPage(url: String): Boolean =
        url == "about:blank" || url.startsWith("blckbolt://") || url.startsWith("data:text/html")

    private fun showHomePage() {
        showingErrorPage = false
        httpFallbackUrl = null
        binding.urlBar.setText("")
        val html = readRaw(R.raw.home)
        webView.loadDataWithBaseURL("blckbolt://home/", html, "text/html", "utf-8", null)
    }

    private fun showErrorPage(detail: String) {
        showingErrorPage = true
        val html = readRaw(R.raw.error)
        webView.loadDataWithBaseURL("about:blank", html, "text/html", "utf-8", null)
    }

    private fun readRaw(resId: Int): String {
        return try {
            resources.openRawResource(resId).bufferedReader().use { it.readText() }
        } catch (_: IOException) {
            "<html><body><h1>Error</h1></body></html>"
        }
    }

    private fun syncNavButtons() {
        binding.btnBack.isEnabled = webView.canGoBack()
        binding.btnForward.isEnabled = webView.canGoForward()
    }

    private fun hideKeyboard() {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
        imm.hideSoftInputFromWindow(binding.urlBar.windowToken, 0)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_home -> {
                showHomePage()
                true
            }
            R.id.action_reload -> {
                webView.reload()
                true
            }
            R.id.action_share -> {
                shareCurrentPage()
                true
            }
            R.id.action_clear_data -> {
                confirmClearData()
                true
            }
            R.id.action_about -> {
                AlertDialog.Builder(this)
                    .setTitle(R.string.about_title)
                    .setMessage(R.string.about_message)
                    .setPositiveButton(android.R.string.ok, null)
                    .show()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun shareCurrentPage() {
        val url = webView.url ?: return
        if (isInternalPage(url)) return
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, url)
        }
        startActivity(Intent.createChooser(intent, getString(R.string.action_share)))
    }

    private fun confirmClearData() {
        AlertDialog.Builder(this)
            .setTitle(R.string.action_clear_data)
            .setMessage("Delete history, cache, cookies, and site data?")
            .setPositiveButton(android.R.string.ok) { _, _ -> clearBrowsingData() }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun clearBrowsingData() {
        webView.clearCache(true)
        webView.clearHistory()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
        WebStorage.getInstance().deleteAllData()
        Toast.makeText(this, R.string.data_cleared, Toast.LENGTH_SHORT).show()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        syncNavButtons()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val HOME_URL = "blckbolt://home/"
    }
}


