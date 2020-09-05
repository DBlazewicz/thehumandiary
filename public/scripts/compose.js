//Adapted From Louis Lazaris
// https://www.impressivewebs.com/textarea-auto-resize/

$(document).ready(function() {
  setListeners();
})

function setListeners() {
  // Targets all textareas with class "txta"
  let textareas = document.querySelector('.txta'),
      hiddenDiv = document.createElement('div'),
      content = null;

  // Adds a class to all textareas
  textareas.classList.add('txtstuff');

  // Build the hidden div's attributes

  // The line below is needed if you move the style lines to CSS
  hiddenDiv.classList.add('hiddendiv');

  // Add the "txta" styles, which are common to both textarea and hiddendiv
  // If you want, you can remove those from CSS and add them via JS
  hiddenDiv.classList.add('txta');

  // Add the styles for the hidden div
  // These can be in the CSS, just remove these three lines and uncomment the CSS
  hiddenDiv.style.display = 'none';
  hiddenDiv.style.whiteSpace = 'pre-wrap';
  hiddenDiv.style.wordWrap = 'break-word';

  textareas.addEventListener('input', function() {
    resize(textareas, hiddenDiv, content);
  })

  resize(textareas, hiddenDiv, content);

  window.addEventListener('resize', function() {
    console.log("window resized");
    resize(textareas, hiddenDiv, content);
  });

}

function resize(textareas, hiddenDiv, content) {
    // Append hiddendiv to parent of textarea, so the size is correct
    textareas.parentNode.appendChild(hiddenDiv);

    // Remove this if you want the user to be able to resize it in modern browsers
    textareas.style.resize = 'none';

    // This removes scrollbars
    textareas.style.overflow = 'hidden';

    // Every input/change, grab the content
    content = textareas.value;

    // Add the same content to the hidden div

    // This is for old IE
    // content = content.replace(/\n/g, '<br>');

    // The <br ..> part is for old IE
    // This also fixes the jumpy way the textarea grows if line-height isn't included
    hiddenDiv.innerHTML = content + '<br style="line-height: 3px;">';

    // Briefly make the hidden div block but invisible
    // This is in order to read the height
    hiddenDiv.style.visibility = 'hidden';
    hiddenDiv.style.display = 'block';
    hiddenDiv.style.width = textareas.offsetWidth - 40 + 'px';
    textareas.style.height = hiddenDiv.offsetHeight + 40 + 'px';


    // Make the hidden div display:none again
    hiddenDiv.style.visibility = 'visible';
    hiddenDiv.style.display = 'none';
  };
