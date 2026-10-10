package dev.petal.mobile

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/**
 * Petal Native Android SQLite Helper
 * Mirrors @petal/storage LocalStore schema (PRD §8, F13, F14):
 * - Table petal_state: singleton row (id=1) holding current revision and full JSON backup payload
 * - Table petal_recovery: audit snapshots of prior states before transactional imports/mutations
 * - user_version = 1
 */
class PetalDatabaseHelper(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "petal.db"
        const val DATABASE_VERSION = 1

        private const val TABLE_STATE = "petal_state"
        private const val TABLE_RECOVERY = "petal_recovery"
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS $TABLE_STATE (" +
                    "id INTEGER PRIMARY KEY CHECK(id=1), " +
                    "revision INTEGER NOT NULL, " +
                    "payload TEXT NOT NULL)"
        )
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS $TABLE_RECOVERY (" +
                    "id TEXT PRIMARY KEY, " +
                    "revision INTEGER NOT NULL, " +
                    "created_at TEXT NOT NULL, " +
                    "payload TEXT NOT NULL)"
        )
        db.version = 1
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Schema version 1 is currently authoritative
    }

    fun getSnapshot(): String? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT payload FROM $TABLE_STATE WHERE id = 1",
            null
        )
        return cursor.use {
            if (it.moveToFirst()) {
                it.getString(0)
            } else {
                null
            }
        }
    }

    fun getRevision(): Int {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT revision FROM $TABLE_STATE WHERE id = 1",
            null
        )
        return cursor.use {
            if (it.moveToFirst()) {
                it.getInt(0)
            } else {
                0
            }
        }
    }

    fun saveSnapshot(revision: Int, payload: String): Boolean {
        val db = writableDatabase
        db.beginTransaction()
        return try {
            val values = ContentValues().apply {
                put("id", 1)
                put("revision", revision)
                put("payload", payload)
            }
            db.insertWithOnConflict(
                TABLE_STATE,
                null,
                values,
                SQLiteDatabase.CONFLICT_REPLACE
            )
            db.setTransactionSuccessful()
            true
        } catch (e: Exception) {
            false
        } finally {
            db.endTransaction()
        }
    }

    fun createRecovery(revision: Int, payload: String): Boolean {
        val db = writableDatabase
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val values = ContentValues().apply {
                put("id", UUID.randomUUID().toString())
                put("revision", revision)
                put("created_at", sdf.format(Date()))
                put("payload", payload)
            }
            db.insert(TABLE_RECOVERY, null, values) > 0
        } catch (e: Exception) {
            false
        }
    }

    fun resetDatabase(): Boolean {
        val db = writableDatabase
        db.beginTransaction()
        return try {
            db.delete(TABLE_STATE, null, null)
            db.delete(TABLE_RECOVERY, null, null)
            db.setTransactionSuccessful()
            true
        } catch (e: Exception) {
            false
        } finally {
            db.endTransaction()
        }
    }
}
