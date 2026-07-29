import Service from 'service';
import { toL10n } from '../util/utils';
import BookmarkDB from '../AppStore/BookmarkDB';

export function unpinBookmark(bookmark) {
  Service.request('showDialog', {
    type: 'confirm',
    ok: 'unpin',
    header: toL10n('confirmation'),
    content: toL10n('confirm-to-unpin-bookmark'),
    translated: true,
    onOk: () => {
      BookmarkDB.get(bookmark.url)
      .then((result) => {
        BookmarkDB.remove(result.url)
          .then(() => {
            Service.request('removeBookmark', result);
          });
      });
    }
  });
}

export function renameBookmark(bookmark) {
  const displayName = bookmark.displayName.slice(0, 255);
  Service.request('showDialog', {
    type: 'prompt',
    ok: 'ok',
    header: toL10n('rename'),
    content: toL10n('title'),
    initialValue: displayName,
    maxLength: 255,
    additionalContent: bookmark.url,
    translated: true,
    onOk: (newname) => {
      if (bookmark.displayName === newname) {
        return;
      }

      BookmarkDB.get(bookmark.url)
        .then((result) => {
          result.name = newname;
          BookmarkDB.update(result, result.url)
            .then(() => {
              Service.request('updateBookmark', result);
            });
        });
    }
  });
}
