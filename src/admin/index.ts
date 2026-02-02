interface AdminApp {
  addMenuLink?: (options: any) => void;
}

interface AdminModule {
  register: (app: AdminApp) => void;
  bootstrap: (app: AdminApp) => void;
}

const adminModule: AdminModule = {
  register(_app: AdminApp) {
    // Registration of link in main menu removed, as settings are done via config file
    // app.addMenuLink({...});
  },
  
  bootstrap(_app: AdminApp) {
    console.log('🚀 [Slug For Strapi] Admin panel bootstrap');
  },
};

export default adminModule;
