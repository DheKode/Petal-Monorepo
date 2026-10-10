package dev.petal.mobile

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowInsetsController
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var dbHelper: PetalDatabaseHelper
    private lateinit var assetLoader: WebViewAssetLoader

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        dbHelper = PetalDatabaseHelper(this)

        assetLoader = WebViewAssetLoader.Builder()
            .setDomain("petal.local")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#FFF7FA"))

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
                builtInZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mediaPlaybackRequiresUserGesture = false
            }

            // Register native bridge for SQLite persistence and offline fallback
            addJavascriptInterface(PetalNativeBridge(this@MainActivity, dbHelper), "PetalNative")

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    Log.d(
                        "PetalWebView",
                        "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}"
                    )
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    val url = request?.url ?: return null
                    return handleAssetRequest(url)
                }

                @Deprecated("Deprecated in Java")
                override fun shouldInterceptRequest(
                    view: WebView?,
                    url: String?
                ): WebResourceResponse? {
                    val uri = if (url != null) Uri.parse(url) else return null
                    return handleAssetRequest(uri)
                }

                private fun handleAssetRequest(uri: Uri): WebResourceResponse? {
                    val response = assetLoader.shouldInterceptRequest(uri)
                    if (response != null) return response

                    // Defensive path rewriting: If a resource was requested as /assets/...
                    // instead of /assets/web/assets/..., rewrite it to point to web/
                    val path = uri.path ?: ""
                    if (path.startsWith("/assets/") && !path.startsWith("/assets/web/")) {
                        val rewritten = uri.buildUpon()
                            .path("/assets/web/" + path.removePrefix("/assets/"))
                            .build()
                        return assetLoader.shouldInterceptRequest(rewritten)
                    }
                    return null
                }
            }
        }

        // Modern back navigation callback for Android 13+ (predictive back gesture support)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (this@MainActivity::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        setContentView(webView)

        try {
            window.statusBarColor = Color.parseColor("#FFF7FA")
            window.navigationBarColor = Color.parseColor("#FFFFFF")
            WindowCompat.getInsetsController(window, window.decorView)?.let { controller ->
                controller.isAppearanceLightStatusBars = true
                controller.isAppearanceLightNavigationBars = true
            }
        } catch (e: Exception) {
            Log.w("Petal", "Could not configure insets controller", e)
        }

        // Load self-contained web bundle
        webView.loadUrl("https://petal.local/assets/web/index.html")
    }

    override fun onDestroy() {
        if (this::dbHelper.isInitialized) {
            dbHelper.close()
        }
        super.onDestroy()
    }
}
