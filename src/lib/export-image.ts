import { toast } from 'sonner';

/**
 * Export the current graph canvas as a PNG image.
 * Uses html-to-canvas (html2canvas) to capture the React Flow viewport.
 * Must use dynamic import since html2canvas only works client-side.
 */
export async function exportGraphAsPNG(): Promise<void> {
  try {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!viewport) {
      toast.error('Could not find graph viewport');
      return;
    }

    // Dynamic import for client-side only
    const html2canvas = (await import('html-to-canvas')).default;

    const canvas = await html2canvas(viewport, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Convert to PNG and trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `knowledge-graph-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Graph exported as PNG');
  } catch (err) {
    console.error('PNG export error:', err);
    toast.error('Failed to export graph as PNG');
  }
}
