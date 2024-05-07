package com.example.myapplication

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.webkit.PermissionRequest
import android.widget.Button
import android.widget.EditText
import android.widget.TextView

class MainActivity : AppCompatActivity() {

    //private val url = "https://dbl563prmk8i4.cloudfront.net/participant1.html" // streamr 1.0 pre-testnet implementation
    // on-line demo that uses streamr 1.0, try to open https://dbl563prmk8i4.cloudfront.net/participant2.html to see the counterparty

    // ALTERNATIVELY, replate url address with one below, test out the participant2.html link on browser while app is running
    // brubeck demo assets, open https://dbl563prmk8i4.cloudfront.net/participant2_movius.html to interact with demo
    private val url = "file:///android_asset/simple1.html"

    private val REQUEST_PERMISSIONS = 1
    private lateinit var webView: WebView
    private lateinit var inputField: EditText
    private lateinit var sendButton: Button
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        inputField = findViewById(R.id.inputField)
        sendButton = findViewById(R.id.button2)

        webView = findViewById(R.id.webView)
        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.allowContentAccess = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowFileAccessFromFileURLs = true
        // Enable camera and microphone access
        webSettings.mediaPlaybackRequiresUserGesture = false

        sendButton.setOnClickListener {
            val textToSend = inputField.text.toString()
            webView.evaluateJavascript("javascript:sendMsgToStreamr('$textToSend')", null)
            inputField.text.clear()
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.CAMERA
                ) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.RECORD_AUDIO
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO),
                    REQUEST_PERMISSIONS
                )
            } else {
                // Permissions are already granted
                //initializeWebView()
                webView.webChromeClient = object : WebChromeClient() {
                    override fun onPermissionRequest(request: PermissionRequest) {
                        request.grant(request.resources)
                    }
                }
                webView.loadUrl(url)
            }
        } else {
            webView.webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    request.grant(request.resources)
                }
            }
            webView.loadUrl(url)
        }


    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted, you can inform your WebView or handle the logic accordingly
                println("DEBUG -> Permission granted.")
                webView.evaluateJavascript("main()") { result ->
                    // Handle the JavaScript function's result if needed
                    println("DEBUG -> ${result}")
                }
            } else {
                println("DEBUG -> Permission denied.")
                // Permission denied, handle accordingly (e.g., show a message)
            }
        }
    }
}