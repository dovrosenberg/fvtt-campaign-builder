// from mouse0270/fvtt-vue

/**
 * For checkboxes, if the value of the checkbox is true, add the "checked" property, otherwise add nothing.
 * @param {boolean} value - The value of the checkbox.
 * @returns {string} - The "checked" property if the value is true, otherwise an empty string.
 */
const checked = (value) => Handlebars.helpers.checked(value);

/**
 * For form inputs, if the value is false, add the "disabled" property, otherwise add nothing.
 * @param {boolean} value - The value of the input.
 * @returns {string} - The "disabled" property if the value is false, otherwise an empty string.
 */
const disabled = (value) => Handlebars.helpers.disabled(value);

/**
 * Concatenate a number of string terms into a single string.
 * This is useful for passing arguments with variable names.
 * @param {string[]} values - The values to concatenate
 * @returns {Handlebars.SafeString} - The concatenated string
 */
const concat = (...values) => Handlebars.helpers.concat(...values);

/**
 * Construct an editor element for rich text editing with TinyMCE or ProseMirror.
 * @param {string} content - The content to display and edit.
 * @param {object} [options]
 * @param {string} [options.target] - The named target data element
 * @param {boolean} [options.button] - Include a button used to activate the editor later?
 * @param {string} [options.class] - A specific CSS class to add to the editor container
 * @param {boolean} [options.editable=true] - Is the text editor area currently editable?
 * @param {string} [options.engine=tinymce] - The editor engine to use, see {@link TextEditor.create}.
 * @param {boolean} [options.collaborate=false] - Whether to turn on collaborative editing features for ProseMirror.
 * @returns {Handlebars.SafeString} - The rendered editor HTML
 */
const editor = (content, options) => Handlebars.helpers.editor(content, { hash: options });

/**
 * A ternary expression that allows inserting A or B depending on the value of C.
 * @param {boolean} criteria - The test criteria
 * @param {string} ifTrue - The string to output if true
 * @param {string} ifFalse - The string to output if false
 * @returns {string} - The ternary result
 */
const ifThen = (criteria, ifTrue, ifFalse) => Handlebars.helpers.ifThen(criteria, ifTrue, ifFalse);

/**
 * Translate a provided string key by using the loaded dictionary of localization strings.
 * @param {string} value - The string key to translate
 * @param {object} [data] - Additional data to pass to the localization string
 * @returns {string} - The translated string
 */
const localize = (value, data = {}) => Handlebars.helpers.localize(value, { hash: data });

/**
 * A string formatting helper to display a number with a certain fixed number of decimals and an explicit sign.
 * @param {number|string} value - A numeric value to format
 * @param {object} options - Additional options which customize the resulting format
 * @param {number} [options.decimals=0] - The number of decimal places to include in the resulting string
 * @param {boolean} [options.sign=false] - Whether to include an explicit "+" sign for positive numbers
 * @returns {Handlebars.SafeString} - The formatted string to be included in a template
 */
const numberFormat = (value, options) => Handlebars.helpers.numberFormat(value, { hash: options });

/**
 * Render a form input field of type number with value appropriately rounded to step size.
 * @param {number} value
 * @param {FormInputConfig<number> & NumberInputConfig} options
 * @returns {Handlebars.SafeString}
 */
const numberInput = (value, options) => Handlebars.helpers.numberInput(value, { hash: options });

/**
 * A helper to create a set of radio checkbox input elements in a named set.
 * The provided keys are the possible radio values while the provided values are human readable labels.
 *
 * @param {string} name - The radio checkbox field name
 * @param {object} choices - A mapping of radio checkbox values to human readable labels
 * @param {object} options - Options which customize the radio boxes creation
 * @param {string} options.checked - Which key is currently checked?
 * @param {boolean} options.localize - Pass each label through string localization?
 * @returns {Handlebars.SafeString}
 */
const radioBoxes = (name, choices, options) => Handlebars.helpers.radioBoxes(name, choices, { hash: options });

/**
 * Render a pair of inputs for selecting a value in a range.
 * @param {object} options - Helper options
 * @param {string} [options.name] - The name of the field to create
 * @param {number} [options.value] - The current range value
 * @param {number} [options.min] - The minimum allowed value
 * @param {number} [options.max] - The maximum allowed value
 * @param {number} [options.step] - The allowed step size
 * @returns {Handlebars.SafeString}
 */
const rangePicker = (options) => Handlebars.helpers.rangePicker({ hash: options });

/**
 * A helper to create a set of &lt;option> elements in a &lt;select> block based on a provided dictionary.
 * The provided keys are the option values while the provided values are human-readable labels.
 * This helper supports both single-select and multi-select input fields.
 *
 * @param {object|Array<object>} choices - A mapping of radio checkbox values to human-readable labels
 * @param {SelectInputConfig & SelectOptionsHelperOptions} options  Options which configure how select options are generated by the helper
 * @returns {Handlebars.SafeString} - Generated HTML safe for rendering into a Handlebars template
 */
const selectOptions = (choices, options) => Handlebars.helpers.selectOptions(choices, { hash: options });

/**
 * Convert a DataField instance into an HTML input fragment.
 * @param {DataField} field - The DataField instance to convert to an input
 * @param {object} options - Helper options
 * @returns {Handlebars.SafeString} - The rendered form input HTML
 */
const formInput = (field, options) => Handlebars.helpers.formInput(field, { hash: options });

/**
 * Convert a DataField instance into an HTML input fragment.
 * @param {DataField} field - The DataField instance to convert to an input
 * @param {object} options - Helper options
 * @returns {Handlebars.SafeString} - The rendered form group HTML
 */
const formGroup = (field, options) => Handlebars.helpers.formGroup(field, { hash: options });

/**
 * Convert a DataField instance into an HTML input fragment.
 * @param {DataField} field - The DataField instance to convert to an input
 * @param {object} options - Helper options
 * @returns {Handlebars.SafeString}
 */
const formField = (field, options) => Handlebars.helpers.formField(field, { hash: options });

/**
 * Express a timestamp as a relative string
 * @param {Date|string} timeStamp - A timestamp string or Date object to be formatted as a relative time
 * @return {string} - A string expression for the relative time
 */
const timeSince = (timeStamp) => Handlebars.helpers.timeSince(timeStamp);

/**
 * Checks if two values are equal using Handlebars helpers.
 * @param {*} v1 - The first value to compare.
 * @param {*} v2 - The second value to compare.
 * @returns {boolean} - Returns true if the values are equal, otherwise false.
 */
const eq = (v1, v2) => Handlebars.helpers.eq(v1, v2);

/**
 * Checks if two values are not equal using the Handlebars `ne` helper.
 * @param {*} v1 - The first value to compare.
 * @param {*} v2 - The second value to compare.
 * @returns {boolean} - Returns `true` if the values are not equal, `false` otherwise.
 */
const ne = (v1, v2) => Handlebars.helpers.ne(v1, v2);

/**
 * Compares two values and returns true if the first value is less than the second value.
 * @param {*} v1 - The first value to compare.
 * @param {*} v2 - The second value to compare.
 * @returns {boolean} - True if v1 is less than v2, false otherwise.
 */
const lt = (v1, v2) => Handlebars.helpers.lt(v1, v2);

/**
 * Compares two values and returns true if the first value is greater than the second value.
 * @param {*} v1 - The first value to compare.
 * @param {*} v2 - The second value to compare.
 * @returns {boolean} - True if `v1` is greater than `v2`, false otherwise.
 */
const gt = (v1, v2) => Handlebars.helpers.gt(v1, v2);

/**
 * Checks if the first value is less than or equal to the second value.
 * @param {any} v1 - The first value to compare.
 * @param {any} v2 - The second value to compare.
 * @returns {boolean} Returns `true` if `v1` is less than or equal to `v2`, otherwise `false`.
 */
const lte = (v1, v2) => Handlebars.helpers.lte(v1, v2);

/**
 * Checks if the first value is greater than or equal to the second value.
 * @param {any} v1 - The first value to compare.
 * @param {any} v2 - The second value to compare.
 * @returns {boolean} Returns `true` if `v1` is greater than or equal to `v2`, otherwise `false`.
 */
const gte = (v1, v2) => Handlebars.helpers.gte(v1, v2);

/**
 * Returns the logical negation of the given predicate.
 * @param {Function} pred - The predicate function to negate.
 * @returns {boolean} The logical negation of the predicate.
 */
const not = (pred) => Handlebars.helpers.not(pred);

/**
 * Returns the logical AND of all the arguments.
 * @param {...*} arguments - The values to be evaluated.
 * @returns {boolean} The result of the logical AND operation.
 */
const and = () => Handlebars.helpers.and(arguments);

/**
 * Returns the first truthy value from the provided arguments.
 * @param {...*} arguments - The values to check for truthiness.
 * @returns {*} - The first truthy value, or `undefined` if all values are falsy.
 */
const or = () => Handlebars.helpers.or(arguments);

// Export the Handlebars helpers
export {
	checked,
	disabled,
	concat,
	editor,
	ifThen,
	localize,
	numberFormat,
	numberInput,
	radioBoxes,
	rangePicker,
	selectOptions,
	formInput,
	formGroup,
	formField,
	timeSince,
	eq,
	ne,
	lt,
	gt,
	lte,
	gte,
	not,
	and,
	or
};