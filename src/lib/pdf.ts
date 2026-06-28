/**
 * Exports a target DOM element to a high-quality vector PDF
 * using a hidden print iframe and the browser's native print API.
 * This guarantees selectable vector text, sharp SVG rendering,
 * standard page breaks, automatic document outline generation,
 * and extremely small file size.
 */
export async function exportNodeToPdf(node: HTMLElement, filename: string) {
  // Create a hidden iframe
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  iframe.style.pointerEvents = "none"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    throw new Error("Could not access iframe document")
  }

  // Set page title so browser uses it as the default filename in print to PDF dialog
  const oldTitle = document.title
  document.title = filename.replace(/\.pdf$/i, "")

  // Clone preview stylesheets to iframe so that Tailwind and index.css styles are preserved
  const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
  styles.forEach((style) => {
    doc.head.appendChild(style.cloneNode(true))
  })

  // Clone the node to iframe
  const clone = node.cloneNode(true) as HTMLElement
  
  // Set explicit print-specific styles inside the iframe
  const printStyle = doc.createElement("style")
  printStyle.textContent = `
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
    }
    body {
      background: white !important;
      color: black !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: inherit;
    }
    .markdown-preview {
      background: transparent !important;
      color: black !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      overflow: visible !important;
      position: static !important;
    }
    /* Logo scaling in print context */
    .rsnra-logo-img {
      height: 1.8em !important;
      width: auto !important;
    }
    .rsnra-logo-container {
      height: 1.8em !important;
      display: inline-flex !important;
      align-items: center !important;
      vertical-align: middle !important;
    }
    /* Prevent table, pre blocks, list items and blockquotes from breaking across pages awkwardly */
    tr, pre, blockquote, img, li {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    /* Heading break prevention */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      break-after: avoid;
    }
  `
  doc.head.appendChild(printStyle)
  doc.body.appendChild(clone)

  // Wait for all images inside the clone to be fully loaded/decoded before capturing
  const images = Array.from(clone.querySelectorAll("img"))
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })
    })
  )

  // Trigger print
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        resolve()
      } catch (err) {
        console.error(err)
        resolve()
      } finally {
        iframe.remove()
        document.title = oldTitle
      }
    }, 300)
  })
}
