import SwiftUI
import WebKit

/// Where the web canvas is loaded from.
///
/// Debug builds on the Mac try the Vite dev server first (`npm run dev` in ../web) so
/// edits reload instantly; everything else loads the bundled build from the app.
enum WebSource {
    static let devServer = URL(string: "http://localhost:5173")!
    static let bundled = URL(string: "\(BundleSchemeHandler.scheme)://app/index.html")!
}

struct WhiteboardView {
    func makeWebView(coordinator: Coordinator) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.userContentController.add(coordinator, name: "native")
        // Let videos on the board play with sound from a single tap on their controls.
        config.mediaTypesRequiringUserActionForPlayback = []
        #if os(iOS)
        config.allowsInlineMediaPlayback = true
        #endif

        let webView = WKWebView(frame: .zero, configuration: config)
        #if DEBUG
        if #available(macOS 13.3, iOS 16.4, *) { webView.isInspectable = true }
        #endif
        #if os(iOS)
        // The canvas handles its own pan and zoom.
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        #endif
        webView.navigationDelegate = coordinator
        coordinator.load(into: webView)
        return webView
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        private var triedDevServer = false

        func load(into webView: WKWebView) {
            #if DEBUG && os(macOS)
            triedDevServer = true
            webView.load(URLRequest(url: WebSource.devServer, timeoutInterval: 2))
            #else
            webView.load(URLRequest(url: WebSource.bundled))
            #endif
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            // Dev server isn't running: fall back to the bundled build.
            if triedDevServer {
                triedDevServer = false
                webView.load(URLRequest(url: WebSource.bundled))
            }
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
            switch type {
            case "ready":
                print("[whiteboard] canvas ready")
            case "log":
                print("[whiteboard]", body["message"] ?? "")
            default:
                break
            }
        }
    }
}

#if os(macOS)
extension WhiteboardView: NSViewRepresentable {
    func makeNSView(context: Context) -> WKWebView { makeWebView(coordinator: context.coordinator) }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
#else
extension WhiteboardView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView { makeWebView(coordinator: context.coordinator) }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
#endif
