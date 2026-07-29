import React from 'react';
import { unescapeNumericHTMLEntities } from '../util/html_entities';
import { launch } from '../AppStore/Item';
import marquee from '../AppList/marquee';

export default function AppItem(props) {
  let appNameContainer = null;
  let appClassName = [
    'app',
    props.hasNotices ? 'has-notices' : '',
    props.isNewInstall ? 'new-install' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className="app-tile"
      style={props.item.inlineStyle || {}}
    >
      <div
        tabIndex="-1"
        role="menuitem"
        key={props.item.uid}
        className={appClassName}
        onClick={() => launch(props.item)}
        onBlur={() => marquee.hideMarquee(props, appNameContainer)}
      >
        <div
          className="app__icon"
          ref={props.noticeIndicatorRef}
          onAnimationStart={props.handleAnimationStart}
          onAnimationEnd={props.handleAnimationEnd}
          style={{
            color: props.item.theme && props.item.theme.color,
            backgroundImage: `url('${props.item.icon_url}')`
          }}
        >
          <div className="app__notices" />
          <div className="new__install" />
          <div
            className="app__icon--hq"
            style={{ backgroundImage: `url('${props.item.icon_url_hq}')` }}
          />
          {props.item.favicon_url && (
            <div
              className="app__icon--favicon"
              style={{ backgroundImage: `url('${props.item.favicon_url}')` }}
            />
          )}
        </div>
        <div
          className="app__name"
          ref={(node) => { appNameContainer = node; }}
        >
          {unescapeNumericHTMLEntities(props.item.displayName)}
        </div>
      </div>
    </div>
  );
}
