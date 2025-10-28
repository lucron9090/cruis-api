// JS Dependencies: Bootstrap & JQuery
import $ from 'jquery';
import 'bootstrap';

// Using the next two lines is like including partial view _ValidationScriptsPartial.cshtml in Microsoft templates
import 'jquery-validation';
import 'jquery-validation-unobtrusive';

// Custom JS imports
import './validation.js';

// CSS Dependencies: Bootstrap
import '../styles/bootstrap-themed.scss';

// Icons CSS
import '../styles/icons.css';

// Custom CSS imports
import '../styles/site.css';

// Include all asserts
require.context('../assets', true, /.*/);

