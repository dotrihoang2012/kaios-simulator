class Marquee {
  marqueeDelay = null;
  scrollDelay = null;
  EACH_SCROLL_PX = 6;
  SPACE_STR = '\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0';
  showMarquee(props, appNameContainer) {
    if (appNameContainer.scrollWidth <= appNameContainer.offsetWidth) {
      return;
    }
    let originalScrollWidth = appNameContainer.scrollWidth;
    this.marqueeDelay = setTimeout(() => {
      appNameContainer.style.textOverflow = 'unset';
      appNameContainer.innerText = appNameContainer.innerText +
        this.SPACE_STR + appNameContainer.innerText;
      this.makeMarquee(props, appNameContainer, originalScrollWidth);
    }, 1000);
  }

  makeMarquee(props, appNameContainer, originalScrollWidth) {
    const isRtl = 'rtl' === document.dir;
    let scrollWidth = appNameContainer.scrollWidth;
    let scrollLeft = appNameContainer.scrollLeft;
    let needScrollLeft = isRtl ?
      (scrollWidth + scrollLeft < originalScrollWidth + this.EACH_SCROLL_PX)
      : (scrollWidth - scrollLeft - this.EACH_SCROLL_PX > originalScrollWidth);
    if (needScrollLeft) {
      scrollLeft = isRtl ? scrollLeft - this.EACH_SCROLL_PX
        : scrollLeft + this.EACH_SCROLL_PX;
      appNameContainer.scrollLeft = scrollLeft;
      this.scrollDelay = setTimeout(() => {
        this.makeMarquee(props, appNameContainer, originalScrollWidth);
      }, 90);
    } else {
      this.hideMarquee(props, appNameContainer);
    }
  }

  hideMarquee(props, appNameContainer) {
    if ((props.viewMode !== 'list')
      || (appNameContainer.scrollWidth <= appNameContainer.offsetWidth)) {
      return;
    }
    clearTimeout(this.scrollDelay);
    clearTimeout(this.marqueeDelay);
    appNameContainer.innerText = props.item.displayName;
    appNameContainer.style.textOverflow = 'ellipsis';
    appNameContainer.scrollLeft = 0;
  }
}

const marquee = new Marquee();
export default marquee;
