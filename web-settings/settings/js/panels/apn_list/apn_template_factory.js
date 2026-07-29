/**
 * The template function for generating an UI element for an APN item.
 *
 * @module apn_list/apn_template_factory
 */

define([],() => {
  function apnTemplate(apnType, onItemclick, onRadioClick, itemsOBJ, item) {
    const rawApn = item.apn;

    // Create an <input type="radio"> element
    const input = document.createElement('input');
    input.type = 'radio';
    input.checked = item.active;
    input.name = apnType;

    // Include the radio button element in a list item
    const radioSpan = document.createElement('span');
    const radioLabel = document.createElement('label');
    radioLabel.classList.add('pack-radio-large');
    radioLabel.appendChild(input);
    radioLabel.appendChild(radioSpan);

    const nameSpan = document.createElement('span');
    const nameLabel = document.createElement('label');
    nameSpan.classList.add('full-string');
    nameLabel.classList.add('pack-radio-large');
    nameLabel.classList.add('my_radio');
    nameLabel.setAttribute('data-id', item.id);
    itemsOBJ[item.id] = item;
    if (!rawApn.carrier) {
      nameSpan.textContent = rawApn.apn;
    } else {
      nameSpan.textContent = rawApn.carrier;
    }
    nameLabel.appendChild(input);
    nameLabel.appendChild(nameSpan);

    const li = document.createElement('li');
    li.appendChild(nameLabel);
    return li;
  }

  return function apnListTemplate(
    apnType,
    onItemclick,
    onRadioClick,
    itemsOBJ
  ) {
    return apnTemplate.bind(null, apnType, onItemclick, onRadioClick, itemsOBJ);
  };
});
