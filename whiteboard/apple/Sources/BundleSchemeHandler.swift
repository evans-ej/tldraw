import Foundation
import UniformTypeIdentifiers
import WebKit

/// Serves the built web app from the app bundle at `whiteboard://app/...`.
///
/// A custom scheme instead of `file://` gives the page a stable origin, so IndexedDB
/// (where boards are saved) persists, ES modules load, and a tldraw native license key
/// can match the app's URL.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "whiteboard"

    private let root = Bundle.main.resourceURL!.appendingPathComponent("Web", isDirectory: true)

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }

        let fileURL = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard fileURL.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: fileURL)
        else {
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didFinish()
            return
        }

        let mime = UTType(filenameExtension: fileURL.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let headers = ["Content-Type": mime, "Content-Length": "\(data.count)"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
