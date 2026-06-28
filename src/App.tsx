import { useEffect, useRef, useState } from "react"
import type { GroupImperativeHandle, Layout } from "react-resizable-panels"
import type { editor } from "monaco-editor"

import { AppToolbar } from "@/components/toolbar"
import { MarkdownEditor } from "@/components/markdown/editor"
import { MarkdownPreview } from "@/components/markdown/preview"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Toaster } from "@/components/ui/sonner"

const STORAGE_KEY_CONTENT = "resomd:content"
const STORAGE_KEY_MODE = "resomd:mode"

function loadInitialContent() {
  return localStorage.getItem(STORAGE_KEY_CONTENT) ?? ""
}

function loadInitialMode() {
  const storedMode = localStorage.getItem(STORAGE_KEY_MODE)
  if (storedMode === "editor" || storedMode === "split" || storedMode === "preview") {
    return storedMode
  }
  return "split"
}

export function App() {
  const [content, setContent] = useState(loadInitialContent)
  const previewRef = useRef<HTMLDivElement>(null)
  const previewScrollContainerRef = useRef<HTMLDivElement>(null)
  const panelGroupRef = useRef<GroupImperativeHandle>(null)
  
  // Editor state and mutable ref to bypass react-markdown closure caches
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  
  // App display modes: 'editor' (left only), 'split' (both), 'preview' (right only)
  const [mode, setMode] = useState<"editor" | "split" | "preview">(loadInitialMode)
  const modeRef = useRef(mode)

  // Controlled layouts sizes for resizable panels
  const [sizes, setSizes] = useState<Layout>(() => {
    const initialMode = loadInitialMode()
    if (initialMode === "editor") return { editor: 100, preview: 0 }
    if (initialMode === "preview") return { editor: 0, preview: 100 }
    return { editor: 50, preview: 50 }
  })
  
  // Track layout transition states to apply CSS animation classes only when switching modes
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Track which panel is actively hovered to synchronize scroll smoothly
  const activeScrollSourceRef = useRef<"editor" | "preview" | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONTENT, content)
  }, [content])

  // Persist view mode setting in localStorage and update ref on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, mode)
    modeRef.current = mode
  }, [mode])

  // Synchronize scrolling between left pane and right pane
  useEffect(() => {
    if (!editor || mode !== "split") return

    const previewContainer = previewScrollContainerRef.current
    if (!previewContainer) return

    // Monaco -> Preview scroll sync
    const disposable = editor.onDidScrollChange(() => {
      if (activeScrollSourceRef.current !== "editor") return

      const editorScrollHeight = editor.getScrollHeight()
      const editorClientHeight = editor.getLayoutInfo().height
      const editorScrollTop = editor.getScrollTop()
      const maxEditorScroll = editorScrollHeight - editorClientHeight

      if (maxEditorScroll > 0) {
        const ratio = editorScrollTop / maxEditorScroll
        const maxPreviewScroll = previewContainer.scrollHeight - previewContainer.clientHeight
        previewContainer.scrollTop = ratio * maxPreviewScroll
      }
    })

    // Preview -> Monaco scroll sync
    const handlePreviewScroll = () => {
      if (activeScrollSourceRef.current !== "preview") return

      const maxPreviewScroll = previewContainer.scrollHeight - previewContainer.clientHeight
      if (maxPreviewScroll > 0) {
        const ratio = previewContainer.scrollTop / maxPreviewScroll
        const editorScrollHeight = editor.getScrollHeight()
        const editorClientHeight = editor.getLayoutInfo().height
        const maxEditorScroll = editorScrollHeight - editorClientHeight
        editor.setScrollTop(ratio * maxEditorScroll)
      }
    }

    previewContainer.addEventListener("scroll", handlePreviewScroll, { passive: true })

    return () => {
      disposable.dispose()
      previewContainer.removeEventListener("scroll", handlePreviewScroll)
    }
  }, [editor, mode])

  // Handle panel programmatic resize / collapse on mode changes
  useEffect(() => {
    let targetSizes: Layout = { editor: 50, preview: 50 }
    if (mode === "editor") {
      targetSizes = { editor: 100, preview: 0 }
    } else if (mode === "preview") {
      targetSizes = { editor: 0, preview: 100 }
    } else {
      targetSizes = { editor: 50, preview: 50 }
    }

    // Only transition if sizes are actually changing
    if (sizes.editor !== targetSizes.editor || sizes.preview !== targetSizes.preview) {
      setIsTransitioning(true)
      
      // Delay setLayout slightly to let the transition classes render on the DOM first
      const timer = setTimeout(() => {
        if (panelGroupRef.current) {
          panelGroupRef.current.setLayout(targetSizes)
        }
        setSizes(targetSizes)
      }, 30)

      // Force Monaco editor layout smooth loop
      const startTime = performance.now()
      const duration = 200

      let animationFrameId: number

      const animateLayout = () => {
        const currentEditor = editorRef.current
        if (currentEditor) {
          currentEditor.layout()
        }
        const elapsed = performance.now() - startTime
        if (elapsed < duration) {
          animationFrameId = requestAnimationFrame(animateLayout)
        } else {
          setIsTransitioning(false)
        }
      }

      animationFrameId = requestAnimationFrame(animateLayout)

      return () => {
        clearTimeout(timer)
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [mode])

  // ResizablePanelGroup layout change event: triggered by user drags
  const handleLayout = (newLayout: Layout) => {
    if (isTransitioning) return

    setSizes(newLayout)

    // Sync mode state with collapsed panes on manual drag finishes
    const editorSize = newLayout.editor ?? 50
    const previewSize = newLayout.preview ?? 50
    if (editorSize >= 99) {
      if (mode !== "editor") setMode("editor")
    } else if (previewSize >= 99) {
      if (mode !== "preview") setMode("preview")
    } else {
      if (mode !== "split") setMode("split")
    }
  }

  // Resets the resizable panels back to 50/50 and activates Split view
  const handleResetLayout = () => {
    const targetSizes: Layout = { editor: 50, preview: 50 }
    if (sizes.editor !== targetSizes.editor || sizes.preview !== targetSizes.preview) {
      setIsTransitioning(true)
      setMode("split")
      
      setTimeout(() => {
        if (panelGroupRef.current) {
          panelGroupRef.current.setLayout(targetSizes)
        }
        setSizes(targetSizes)
      }, 30)
      
      const startTime = performance.now()
      const duration = 200
      
      const animateLayout = () => {
        const currentEditor = editorRef.current
        if (currentEditor) {
          currentEditor.layout()
        }
        const elapsed = performance.now() - startTime
        if (elapsed < duration) {
          requestAnimationFrame(animateLayout)
        } else {
          setIsTransitioning(false)
        }
      }
      requestAnimationFrame(animateLayout)
    }
  }

  // Single-click navigation handler: positions cursor in Monaco at the clicked block
  const handleSelectBlock = (offset: number) => {
    console.log("handleSelectBlock: offset =", offset, "editor =", !!editorRef.current)
    // If in preview mode, switch to split mode to show the editor
    if (modeRef.current === "preview") {
      setMode("split")
    }

    const currentEditor = editorRef.current
    if (currentEditor) {
      const model = currentEditor.getModel()
      if (model) {
        const position = model.getPositionAt(offset)
        currentEditor.setPosition(position)
        currentEditor.revealPositionInCenter(position)
      }
      
      // Delay focus slightly to bypass browser click focus-stealing
      setTimeout(() => {
        currentEditor.focus()
      }, 20)
    } else {
      console.warn("handleSelectBlock: editor instance is missing!")
    }
  }

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    console.log("handleEditorMount: editorInstance =", !!editorInstance)
    setEditor(editorInstance)
    editorRef.current = editorInstance
  }

  return (
    <div className="flex h-svh flex-col select-none">
      <AppToolbar 
        content={content} 
        onLoadContent={setContent} 
        previewRef={previewRef}
        mode={mode}
        onModeChange={setMode}
      />

      <div className="min-h-0 flex-1 bg-background select-text">
        <ResizablePanelGroup 
          ref={panelGroupRef}
          orientation="horizontal"
          defaultLayout={sizes}
          onLayoutChange={handleLayout}
        >
          {/* Left Panel: Editor */}
          <ResizablePanel
            id="editor"
            minSize={0}
            defaultSize={50}
            className="h-full overflow-hidden"
            data-transitioning={isTransitioning ? "true" : undefined}
          >
            <div 
              className="h-full overflow-hidden"
              onMouseEnter={() => { activeScrollSourceRef.current = "editor" }}
              onMouseLeave={() => { if (activeScrollSourceRef.current === "editor") activeScrollSourceRef.current = null }}
            >
              <MarkdownEditor value={content} onChange={setContent} onMount={handleEditorMount} />
            </div>
          </ResizablePanel>

          <ResizableHandle onDoubleClick={handleResetLayout} />

          {/* Right Panel: Preview */}
          <ResizablePanel
            id="preview"
            minSize={0}
            defaultSize={50}
            className="h-full overflow-hidden"
            data-transitioning={isTransitioning ? "true" : undefined}
          >
            <div
              ref={previewScrollContainerRef}
              className="h-full overflow-y-auto bg-muted/40"
              onMouseEnter={() => { activeScrollSourceRef.current = "preview" }}
              onMouseLeave={() => { if (activeScrollSourceRef.current === "preview") activeScrollSourceRef.current = null }}
            >
              <MarkdownPreview 
                ref={previewRef} 
                content={content} 
                onSelectBlock={handleSelectBlock}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Toaster />
    </div>
  )
}

export default App
