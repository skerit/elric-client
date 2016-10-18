/**
 * The capability indicator
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Janeway} janeway   The parent janeway instance
 */
var Capability = Function.inherits('Develry.Janeway.Indicator', function CapabilityIndicator(janeway, name, options) {

	// All the capabilities
	this.capabilities = {};

	CapabilityIndicator.super.call(this, janeway, name, options);

	// Set hammers as the icon
	this.setIcon('⚒');
});

/**
 * Set capability status
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Capability.setMethod(function setCapability(name, status) {

	var hover_text = '',
	    max_length = 0,
	    max_right = 0,
	    separator,
	    list,
	    conf,
	    cap,
	    i;

	if (!this.capabilities[name]) {
		this.capabilities[name] = {
			name : name
		};
	}

	conf = this.capabilities[name];
	conf.status = status;

	list = Object.values(this.capabilities);
	list.sortByPath('name');

	for (i = 0; i < list.length; i++) {
		cap = list[i];

		if (cap.name.length > max_length) {
			max_length = cap.name.length;
		}

		if (cap.status.length > max_right) {
			max_right = cap.status.length;
		}
	}

	max_length += 3;

	for (i = 0; i < list.length; i++) {
		cap = list[i];
		separator = ' '.multiply((max_length - cap.name.length) + (max_right - cap.status.length));

		if (hover_text) {
			hover_text += '\n';
		}

		hover_text += cap.name + separator + cap.status;
	}

	this.setHover(hover_text);
});