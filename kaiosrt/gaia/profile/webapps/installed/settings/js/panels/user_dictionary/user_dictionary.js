/**
 * Handle user_dictionary panel's functionality.
 */


// eslint-disable-next-line
define([],function() {
  const UserDictionary = function UserDictionary() {
    this.elements = null;
    this.keypadHelper = null;
    this.lang = '';
    this.userWords = null;
  };

  UserDictionary.prototype = {
    init: function init(elements, options) {
      this.elements = elements;
      this.keypadHelper = options.KeypadHelper;
    },

    showUserDictionary: function showUserDictionary(options) {
      this.lang = options.Lang;
      return new Promise(resolve => {
        const showDictionary = () => {
          if (this.userWords.length > 0) {
            this.elements.emptyPage.classList.add('hidden');
            this.renderUserDictionary();
          } else {
            this.elements.emptyPage.classList.remove('hidden');
          }
          resolve(!this.userWords.length);
        };
        if (this.userWords !== null) {
          return showDictionary();
        }
        return this.keypadHelper.getUserWordList(this.lang).then(
          userWords => {
            this.userWords = userWords;
            showDictionary();
          },
          userWords => {
            DebugHelper.debug(`getUserWordList:${userWords}`);
            this.userWords = [];
            showDictionary();
          }
        );
      });
    },

    updateUserWord: function updateUserWord(action, word) {
      return new Promise(resolve => {
        const currentElement = document.querySelector(
          '#user_dictionary ul .focus'
        );
        const bEdit = action === 'edit';

        if (bEdit) {
          const index = this.userWords.indexOf(currentElement.textContent);
          this.userWords.splice(index, 1);
        }
        this.userWords.push(word);
        this.userWords.sort((a, b) => {
          return a.localeCompare(b);
        });
        return this.keypadHelper
          .putUserWordList(this.lang, this.userWords)
          .then(() => {
            const index = this.userWords.indexOf(word);
            const li = document.createElement('li');
            li.textContent = word;
            if (bEdit) {
              this.elements.list.removeChild(currentElement);
            }
            this.elements.list.insertBefore(
              li,
              this.elements.list.childNodes[index]
            );
            if (this.userWords.length > 0) {
              this.elements.emptyPage.classList.add('hidden');
            }
            resolve({
              empty: !this.userWords.length,
              index
            });
          });
      });
    },

    removeUserWord: function removeUserWord(removeElement) {
      return new Promise(resolve => {
        const deletingWord = removeElement.textContent;
        const index = this.userWords.indexOf(deletingWord);
        this.userWords.splice(index, 1);
        return this.keypadHelper
          .putUserWordList(this.lang, this.userWords)
          .then(() => {
            this.elements.list.removeChild(removeElement);
            if (this.userWords.length === 0) {
              this.elements.emptyPage.classList.remove('hidden');
            }
            resolve(!this.userWords.length);
          });
      });
    },

    renderUserDictionary: function renderUserDictionary() {
      this.elements.list.innerHTML = '';
      this.userWords.forEach(userWord => {
        const li = document.createElement('li');
        li.textContent = userWord;
        this.elements.list.appendChild(li);
      });
    }
  };

  return function userDictionary() {
    return new UserDictionary();
  };
});
