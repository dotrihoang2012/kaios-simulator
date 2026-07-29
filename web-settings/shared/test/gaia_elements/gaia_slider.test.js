import{expect,fixture,html}from"@open-wc/testing";import"../../elements/gaia_slider/gaia_slider";describe("shared webcomponents gaia-slider test",()=>{it("gaia-slider initial value should be zero/noborder should be false",async()=>{var e=await fixture(html`
      <gaia-slider></gaia-slider>
    `);expect(e.value).to.equal(0),expect(e.noborder).to.equal("false")}),it("gaia-slider set value should work",async()=>{const e=await fixture(html`
      <gaia-slider></gaia-slider>
    `);e.value=75;var a=e.shadowRoot.querySelector("input");expect(parseInt(a.value,10)).to.equal(75)}),it("gaia-slider setRange should work property",async()=>{const e=await fixture(html`
      <gaia-slider></gaia-slider>
    `);e.setRange(10,90);var a=e.shadowRoot.querySelector("input");expect(parseInt(a.min,10)).to.equal(10),expect(parseInt(a.max,10)).to.equal(90)}),it("gaia-slider events should work property",async()=>{const e=await fixture(html`
      <gaia-slider></gaia-slider>
    `);const a=e.shadowRoot.querySelector("input");var t=new CustomEvent("change");a.dispatchEvent(t);t=new CustomEvent("input");a.dispatchEvent(t),expect(!0).to.equal(!0)}),it("gaia-slider input min&max should work property",async()=>{const e=await fixture(html`
      <gaia-slider></gaia-slider>
    `),a=e.shadowRoot.querySelector("input");a.min=1,a.max=110,e.value=75,expect(parseInt(a.value,10)).to.equal(75)}),it("gaia-slider with transparent property should normally render",async()=>{const e=await fixture(html`
      <gaia-slider transparent="true"></gaia-slider>
    `),a=e.shadowRoot.querySelector("input");expect(a.classList.contains("transparent")).to.equal(!0)}),it("gaia-slider input should include min class when value is 0",async()=>{const e=await fixture(html`
      <gaia-slider></gaia-slider>
    `),a=e.shadowRoot.querySelector("input");a.min=0,a.max=110,e.value=0,expect(parseInt(a.value,10)).to.equal(0),expect(a.classList.contains("min")).to.equal(!0)}),it("gaia-slider input should include max class when value is 110",async()=>{const e=await fixture(html`
      <gaia-slider></gaia-slider>
    `),a=e.shadowRoot.querySelector("input");a.min=0,a.max=110,e.value=110,expect(parseInt(a.value,10)).to.equal(110),expect(a.classList.contains("max")).to.equal(!0)}),it("gaia-slider with data-no-border property should normally render",async()=>{const e=await fixture(html`
      <gaia-slider data-no-border="true"></gaia-slider>
    `);expect(e._noborder).to.equal("true");const a=e.shadowRoot.querySelector("input");expect(a.classList.contains("no-border-radius")).to.equal(!0)})});