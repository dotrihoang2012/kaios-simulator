import{expect,fixture,html}from"@open-wc/testing";import"../../elements/gaia_progress/gaia_progress";describe("shared webcomponents gaia-progress test",()=>{it("gaia-progress initial value should be zero",async()=>{var e=await fixture(html`
      <gaia-progress></gaia-progress>
    `);expect(e.value).to.equal(0)}),it("gaia-progress value should be 75",async()=>{const e=await fixture(html`
      <gaia-progress></gaia-progress>
    `);e.value=75;var a=document.querySelector("gaia-progress");expect(a.value).to.equal(75)})});