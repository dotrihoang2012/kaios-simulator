import{expect,fixture,html}from"@open-wc/testing";import"../../elements/gaia_tabs/gaia_tabs";describe("shared webcomponents gaia-tabs test",()=>{it("gaia-tabs default selected should be zero",async()=>{var a=await fixture(html`
      <gaia-tabs
        id="root-tab"
        class="h3"
        underline="child"
        selected="0"
        position="top"
      >
        <div slot="tab">
          <span data-l10n-id="networkAndConnectivity"></span>
        </div>
        <div slot="tab"><span data-l10n-id="personalization"></span></div>
        <div slot="tab"><span data-l10n-id="privacyAndSecurity"></span></div>
        <div slot="tab"><span data-l10n-id="storage"></span></div>
        <div slot="tab"><span data-l10n-id="device"></span></div>
        <div slot="tab"><span data-l10n-id="accounts"></span></div>
      </gaia-tabs>
    `);expect(a.selected).to.equal(0)}),it("gaia-tabs selected item should be 3",async()=>{const a=await fixture(html`
      <gaia-tabs
        id="root-tab"
        class="h3"
        underline="child"
        selected="0"
        position="top"
      >
        <div slot="tab">
          <span data-l10n-id="networkAndConnectivity"></span>
        </div>
        <div slot="tab"><span data-l10n-id="personalization"></span></div>
        <div slot="tab"><span data-l10n-id="privacyAndSecurity"></span></div>
        <div slot="tab"><span data-l10n-id="storage"></span></div>
        <div slot="tab"><span data-l10n-id="device"></span></div>
        <div slot="tab"><span data-l10n-id="accounts"></span></div>
      </gaia-tabs>
    `);a.select(3),expect(a.selected).to.equal(3)})});