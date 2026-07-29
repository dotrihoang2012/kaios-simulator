import React from 'react';
import { unescapeNumericHTMLEntities } from '../util/html_entities';
import { launch } from '../AppStore/Item';

function SidemenuItem(props) {
  return (
    <div
      tabIndex="-1"
      role="menuitem"
      className={`sidemenuItem ${props.hasNotices ? 'has-notices' : ''}`}
      data-index={props.index}
      ref={props.domRef}
      data-total={props.total}
      onClick={() => launch(props.item)}
    >
      <div
        className="sidemenuItem__icon"
        ref={props.noticeIndicatorRef}
        style={{ backgroundImage: `url('${props.item.icon_url}')` }}
      >
        <div
          className="app__notices"
          onAnimationEnd={props.handleAnimationEnd}
        />
      </div>
      <div className="sidemenuItem__name">
        {unescapeNumericHTMLEntities(props.item.displayName)}
      </div>
    </div>
  );
}

export default SidemenuItem;
