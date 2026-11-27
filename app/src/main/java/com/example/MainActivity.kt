package com.example

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.io.ByteArrayInputStream

class MainActivity : ComponentActivity() {

  private var webView: WebView? = null

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    WindowCompat.setDecorFitsSystemWindows(window, false)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.attributes =
        window.attributes.apply {
          layoutInDisplayCutoutMode =
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
    }
    applyImmersiveFullscreen()

    val wv = WebView(this).apply {
      layoutParams =
        ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
      setBackgroundColor(Color.parseColor("#1B222C"))
      isHapticFeedbackEnabled = false

      settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        mediaPlaybackRequiresUserGesture = false
        allowFileAccess = false
        allowContentAccess = false
        cacheMode = WebSettings.LOAD_DEFAULT
        useWideViewPort = true
        loadWithOverviewMode = true
      }

      webViewClient =
        object : WebViewClient() {
          override fun shouldInterceptRequest(
            view: WebView?,
            request: WebResourceRequest?,
          ): WebResourceResponse? {
            val uri = request?.url ?: return null
            if (uri.host != VIRTUAL_HOST) {
              return WebResourceResponse(
                "text/plain",
                "UTF-8",
                403,
                "Offline Only",
                emptyMap(),
                ByteArrayInputStream(ByteArray(0)),
              )
            }
            val rawPath = uri.path?.trimStart('/') ?: ""
            val assetRelPath = if (rawPath.isEmpty()) "index.html" else rawPath
            return try {
              val stream = assets.open("public/$assetRelPath")
              WebResourceResponse(mimeTypeFor(assetRelPath), "UTF-8", stream)
            } catch (_: Exception) {
              WebResourceResponse(
                "text/plain",
                "UTF-8",
                404,
                "Not Found",
                emptyMap(),
                ByteArrayInputStream(ByteArray(0)),
              )
            }
          }
        }
    }

    wv.addJavascriptInterface(KavirHapticsBridge(this), "KavirHaptics")
    webView = wv
    setContentView(wv)
    wv.loadUrl("https://$VIRTUAL_HOST/index.html")

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          webView?.evaluateJavascript(
            "window.__kavirAndroidBack ? window.__kavirAndroidBack() : false;"
          ) { result ->
            if (result != "true") {
              isEnabled = false
              onBackPressedDispatcher.onBackPressed()
              isEnabled = true
            }
          }
        }
      },
    )
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      applyImmersiveFullscreen()
    }
  }

  override fun onPause() {
    cancelVibration()
    webView?.evaluateJavascript(
      "window.__kavirAndroidPause && window.__kavirAndroidPause();",
      null,
    )
    webView?.onPause()
    super.onPause()
  }

  override fun onResume() {
    super.onResume()
    applyImmersiveFullscreen()
    webView?.onResume()
  }

  override fun onDestroy() {
    cancelVibration()
    webView?.destroy()
    webView = null
    super.onDestroy()
  }

  private fun getVibrator(): Vibrator? {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val mgr = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        mgr?.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun triggerVibration(durationMs: Int, amplitude: Int) {
    val vibrator = getVibrator() ?: return
    if (!vibrator.hasVibrator()) return
    val clampedMs = durationMs.coerceIn(6, 450).toLong()
    val clampedAmp = amplitude.coerceIn(1, 255)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val effectAmplitude = if (vibrator.hasAmplitudeControl()) clampedAmp else VibrationEffect.DEFAULT_AMPLITUDE
        vibrator.vibrate(VibrationEffect.createOneShot(clampedMs, effectAmplitude))
      } else {
        @Suppress("DEPRECATION")
        vibrator.vibrate(clampedMs)
      }
    } catch (_: Exception) {
      // Ignore hardware vibration failures
    }
  }

  private fun cancelVibration() {
    try {
      getVibrator()?.cancel()
    } catch (_: Exception) {
      // Ignore
    }
  }

  private inner class KavirHapticsBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun vibrate(durationMs: Int, amplitude: Int) {
      activity.triggerVibration(durationMs, amplitude)
    }

    @JavascriptInterface
    fun cancel() {
      activity.cancelVibration()
    }
  }

  private fun applyImmersiveFullscreen() {
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    controller.hide(WindowInsetsCompat.Type.systemBars())
  }

  private fun mimeTypeFor(path: String): String {
    return when {
      path.endsWith(".html") -> "text/html"
      path.endsWith(".js") || path.endsWith(".mjs") -> "application/javascript"
      path.endsWith(".css") -> "text/css"
      path.endsWith(".json") -> "application/json"
      path.endsWith(".svg") -> "image/svg+xml"
      path.endsWith(".png") -> "image/png"
      path.endsWith(".webp") -> "image/webp"
      path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
      path.endsWith(".wav") -> "audio/wav"
      path.endsWith(".ogg") -> "audio/ogg"
      path.endsWith(".mp3") -> "audio/mpeg"
      path.endsWith(".woff2") -> "font/woff2"
      else -> "application/octet-stream"
    }
  }

  companion object {
    private const val VIRTUAL_HOST = "appassets.kavirsavar.local"
  }
}
