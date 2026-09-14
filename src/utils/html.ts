// Strips HTML tags for display/editing in plain <Text>/<TextInput> — React
// Native has no built-in HTML renderer. Good enough for simple paragraph/
// bold/list content_html from the backend; not a full HTML parser.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
