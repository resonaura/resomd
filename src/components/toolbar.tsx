import { useRef, useState } from "react"
import {
  FileDownIcon,
  FileUpIcon,
  Loader2Icon,
  MoonIcon,
  SunIcon,
  SquarePenIcon,
  ColumnsIcon,
  EyeIcon,
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/components/theme/provider"
import { exportNodeToPdf } from "@/lib/pdf"
import { Spinner } from "@/components/ui/spinner"

interface AppToolbarProps {
  content: string
  onLoadContent: (content: string) => void
  previewRef: React.RefObject<HTMLDivElement | null>
  mode: "editor" | "split" | "preview"
  onModeChange: (mode: "editor" | "split" | "preview") => void
}

export function AppToolbar({
  content,
  onLoadContent,
  previewRef,
  mode,
  onModeChange,
}: AppToolbarProps) {
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) {
      return
    }

    const text = await file.text()
    onLoadContent(text)
    toast.success(`Loaded "${file.name}"`)
  }

  const handleDownloadMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "document.md"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = async () => {
    const node = previewRef.current
    if (!node) {
      toast.error("Preview content is not ready for export")
      return
    }

    setIsExporting(true)
    try {
      await exportNodeToPdf(node, "document.pdf")
      toast.success("PDF exported")
    } catch (error) {
      console.error(error)
      toast.error("Failed to export PDF")
    } finally {
      setIsExporting(false)
    }
  }

  const cycleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3 bg-background transition-colors duration-300">
      {/* Left Section: Logo & File actions */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-2.5 pr-2 select-none">
          <img
            src={theme === "dark" ? "/icon.svg" : "/icon-light.svg"}
            alt="ResoMD Logo"
            className="size-5 shrink-0"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          className="hidden"
          onChange={handleFileSelected}
        />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-foreground">
                <FileUpIcon className="size-4" />
                Open
                <span className="sr-only">Open file</span>
              </Button>
            }
          />
          <TooltipContent>Open a .md file</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="sm" onClick={handleDownloadMarkdown} className="text-muted-foreground hover:text-foreground">
                <FileDownIcon className="size-4" />
                Save
                <span className="sr-only">Download Markdown</span>
              </Button>
            }
          />
          <TooltipContent>Download as Markdown</TooltipContent>
        </Tooltip>
      </div>

      {/* Center Section: Display Mode Tab Capsule using standard Buttons */}
      <div className="flex items-center select-none">
        <div className="h-8 p-0.5 bg-muted rounded-lg flex items-center gap-0.5">
          <Button
            variant={mode === "editor" ? "secondary" : "ghost"}
            size="icon-sm"
            className={`h-7 w-9 p-0 rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 ${
              mode === "editor"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            }`}
            title="Editor Mode"
            onClick={() => onModeChange("editor")}
          >
            <SquarePenIcon className="size-4" />
          </Button>

          <Button
            variant={mode === "split" ? "secondary" : "ghost"}
            size="icon-sm"
            className={`h-7 w-9 p-0 rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 ${
              mode === "split"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            }`}
            title="Split Mode"
            onClick={() => onModeChange("split")}
          >
            <ColumnsIcon className="size-4" />
          </Button>

          <Button
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="icon-sm"
            className={`h-7 w-9 p-0 rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 ${
              mode === "preview"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            }`}
            title="Preview Mode"
            onClick={() => onModeChange("preview")}
          >
            <EyeIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Right Section: PDF & Theme Toggles */}
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" onClick={handleExportPdf} disabled={isExporting}>
          {isExporting ? <Loader2Icon className="size-4 animate-spin" /> : <FileDownIcon className="size-4" />}
          Export PDF
        </Button>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={cycleTheme}
                className="relative overflow-hidden cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-center size-4"
                  >
                    {theme === "dark" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
                  </motion.span>
                </AnimatePresence>
              </Button>
            }
          />
          <TooltipContent>Toggle Theme</TooltipContent>
        </Tooltip>
      </div>

      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white"
          >
            <Spinner className="size-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
export default AppToolbar
