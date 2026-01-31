'use strict';

export default {
  register(app) {
    // Registration of link in main menu removed, as settings are done via config file
    // app.addMenuLink({...});
  },
  
  bootstrap(app) {
    console.log('🚀 [Slug For Strapi] Admin panel bootstrap');
  },
}; 