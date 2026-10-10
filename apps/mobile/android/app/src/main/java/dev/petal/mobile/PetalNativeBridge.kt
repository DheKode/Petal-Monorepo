package dev.petal.mobile

import android.content.Context
import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * Petal Native Bridge
 * Exposes Android hardware, local SQLite persistence, and offline fallback to the WebView.
 */
class PetalNativeBridge(
    private val context: Context,
    private val dbHelper: PetalDatabaseHelper
) {

    @JavascriptInterface
    fun getSnapshot(): String? {
        return dbHelper.getSnapshot()
    }

    @JavascriptInterface
    fun getRevision(): Int {
        return dbHelper.getRevision()
    }

    @JavascriptInterface
    fun saveSnapshot(revision: Int, payload: String): Boolean {
        return dbHelper.saveSnapshot(revision, payload)
    }

    @JavascriptInterface
    fun exportBackup(): String? {
        return dbHelper.getSnapshot()
    }

    @JavascriptInterface
    fun importBackup(payload: String): Boolean {
        return try {
            val json = JSONObject(payload)
            val revision = json.optInt("schemaVersion", 1)
            val prior = dbHelper.getSnapshot()
            if (prior != null) {
                val currentRev = dbHelper.getRevision()
                dbHelper.createRecovery(currentRev, prior)
            }
            dbHelper.saveSnapshot(revision, payload)
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun resetDatabase(): Boolean {
        return dbHelper.resetDatabase()
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        return JSONObject().apply {
            put("manufacturer", android.os.Build.MANUFACTURER)
            put("model", android.os.Build.MODEL)
            put("sdk", android.os.Build.VERSION.SDK_INT)
            put("release", android.os.Build.VERSION.RELEASE)
        }.toString()
    }

    @JavascriptInterface
    fun getLocalAiStatus(): String {
        return JSONObject().apply {
            put("modelId", "gemma-4-1b-it-q4_k_m")
            put("name", "Gemma 4 1B IT (4-bit Q4_K_M)")
            put("family", "gemma4")
            put("quantization", "Q4_K_M (4-bit)")
            put("status", "ready")
            put("offline", true)
        }.toString()
    }
}

