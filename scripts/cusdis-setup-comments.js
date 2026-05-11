'use strict';

const path = require('path');

hexo.extend.filter.register('theme_inject', function(injects) {
  injects.postComments.file('default', path.join(hexo.base_dir, 'layout/_partials/cusdis-setup-comments.ejs'));
});
