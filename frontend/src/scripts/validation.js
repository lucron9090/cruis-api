//common validation
var dirty = {};

function hookUpCredentialValidation(selector) {
	dirty[selector] = false;
	var element = $(selector);
	element.keypress(function () {
		dirty[selector] = true;
	})
	element.keyup(function () {
		if (dirty[selector]) {
			if (element.val().length === 0 && !element.parent().hasClass('credentials-not-valid')) {
				element.parent().addClass('credentials-not-valid');
			} else if (element.val().length !== 0 && element.parent().hasClass('credentials-not-valid')) {
				element.parent().removeClass('credentials-not-valid');
			}
		}
	})
}

// Expose this function outside of this file (webpack by default doesn't litter the global scope).
window.hookUpCredentialValidation = hookUpCredentialValidation;