import SwiftUI

@main
struct WhiteboardApp: App {
    var body: some Scene {
        WindowGroup {
            WhiteboardView()
                .ignoresSafeArea()
        }
        #if os(macOS)
        .windowToolbarStyle(.unifiedCompact)
        #endif
    }
}
