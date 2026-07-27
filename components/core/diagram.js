// An inline SVG diagram.
//
// The `svg` prop type is what makes the design system stick: the build rejects
// any SVG carrying its own colour, so a diagram can only be drawn with the
// .lx-node / .lx-edge / .lx-label classes and therefore follows the theme. The
// arrowhead marker comes from the page template — diagrams never repeat it.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'diagram',
    purpose: 'diagrama SVG inline, desenhado com as classes do design system',
    props: { svg: 'svg', caption: 'string?' },
    demo: {
      caption: 'Cliente e servidor',
      svg: `<svg class="lx-svg" viewBox="0 0 380 90" role="img" aria-label="Cliente para servidor">
  <rect class="lx-node lx-node--accent" x="8" y="20" width="120" height="48"/>
  <text class="lx-label" x="68" y="49" text-anchor="middle">Cliente</text>
  <path class="lx-edge" d="M130 44 H 246"/>
  <rect class="lx-node" x="248" y="20" width="120" height="48"/>
  <text class="lx-label" x="308" y="49" text-anchor="middle">Servidor</text>
</svg>`
    }
  },

  // No margin and no padding override here on purpose: how far a figure sits
  // from its neighbour is the container's business, and a diagram card that
  // padded itself would have won on specificity and ignored the phone
  // breakpoint — which is exactly how a card ends up cramped on a small screen.
  css: `
.lx-figure > .lx-card { display: block; }
`,

  render({ svg, caption }) {
    return `  <figure class="lx-figure">
    <div class="lx-card lx-scroll">${svg}</div>
    ${caption ? `<figcaption class="lx-caption">${esc(caption)}</figcaption>` : ''}
  </figure>`;
  }
};
