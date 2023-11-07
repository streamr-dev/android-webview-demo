package com.example.myapplication

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView: WebView = findViewById(R.id.webView)
        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true

        // Enable camera and microphone access
        webSettings.mediaPlaybackRequiresUserGesture = false

        webView.webChromeClient = WebChromeClient()
        webView.loadUrl("https://dbl563prmk8i4.cloudfront.net/watcher.html")
    }
}