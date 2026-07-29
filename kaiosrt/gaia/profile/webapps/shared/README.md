# Shared APP structure in Gaia(SFP3.0)
## current the shared app use Node v12.18.3 to run lint&unit test and meantime will not broken the gaia build system.
.
├── elements        
│   ├── gaia_confirm        
│   │   └── gaia_confirm.js     
│   ├── gaia_progress       
│   │   └── gaia_progress.js        
│   ├── gaia_slider     
│   │   └── gaia_slider.js      
│   ├── gaia_header     
│   │   └── gaia-header.js      
│   ├── gaia_tabs       
│   │   ├── gaia_tabs.css       
│   │   └── gaia_tabs.js        
│   └── README.md       
├── js      
│   ├── helper      
│   │   ├── accessbility        
│   │   │   └── accessibility_helper.js     
│   │   ├── apn     
│   │   │   └── apn_helper.js       
│   │   ├── common      
│   │   │   ├── icons_helper.js     
│   │   │   ├── manifest_helper.js      
│   │   │   └── performance_testing_helper.js       
│   │   ├── contact     
│   │   │   └── contact_photo_helper.js     
│   │   ├── date_time       
│   │   │   └── date_time_helper.js     
│   │   ├── dialog      
│   │   │   ├── confirm_dialog_helper.js        
│   │   │   └── custom_dialog.js        
│   │   ├── keypad      
│   │   │   └── keypad_helper.js        
│   │   ├── manifest        
│   │   │   └── manifest_helper.js            
│   │   ├── navigation      
│   │   │   └── navigation_helper.js        
│   │   ├── notification        
│   │   │   └── notification_helper.js      
│   │   ├── option_menu     
│   │   │   ├── option_menu_helper.js       
│   │   │   └── option_menu.js      
│   │   ├── settings        
│   │   │   └── settings_helper.js      
│   │   ├── softkey     
│   │   │   └── softkey_panel_helper.js     
│   │   ├── stk     
│   │   │   └── stk_helper.js       
│   │   └── wifi        
│   │       └── wifi_helper.js      
│   ├── README.md       
│   ├── session     
│   │   ├── apps_manager        
│   │   │   └── apps_manager.js     
│   │   ├── contacts_manager     
│   │   │   └── contacts_manager.js      
│   │   ├── device_capability       
│   │   │   └── device_capability.js        
│   │   ├── lib_session.js      
│   │   ├── power_manager       
│   │   │   └── power_manager.js        
│   │   ├── README.md       
│   │   ├── settings        
│   │   │   └── settings_observer.js        
│   │   ├── task_scheduler.js       
│   │   └── telephony_manager       
│   │       └── telephony_manager.js        
│   └── utils       
│       ├── blob        
│       │   ├── blobview.js     
│       │   └── settings_url.js     
│       ├── common      
│       │   ├── dump.js     
│       │   ├── lazy_loader.js      
│       │   ├── mime_mapper.js      
│       │   ├── template.js     
│       │   ├── text_normalizer.js      
│       │   ├── utilities.js        
│       │   └── uuid.js     
│       ├── components      
│       │   └── component_utils.js      
│       ├── device_storage      
│       │   ├── enumerate_all.js        
│       │   ├── get_storage_if_available.js     
│       │   └── get_unused_filename.js      
│       ├── font        
│       │   └── font_size_utils.js      
│       ├── l10n        
│       │   ├── l10n_date.js        
│       │   └── l10n.js     
│       ├── media       
│       │   ├── crop_resize_rotate.js       
│       │   ├── downsample.js       
│       │   ├── get_video_rotation.js       
│       │   ├── image_size.js       
│       │   ├── image_utils.js      
│       │   ├── jpeg_metadata_parser.js     
│       │   ├── mediadb.js      
│       │   └── media_utils.js      
│       ├── navigation      
│       │   ├── navigation_handler.js       
│       │   └── navigation_manager.js       
│       ├── phone       
│       │   ├── icc_helper.js       
│       │   ├── mobile_operator.js      
│       │   └── simple_phone_matcher.js     
│       ├── screen      
│       │   └── screen_layout.js        
│       └── storage     
│           └── async_storage.js        
├── locales     
│   └── README.md       
├── manifest.webapp     
├── resources       
│   ├── aml.json        
│   ├── apn.json        
│   ├── deps_license.html       
│   ├── lyf_reliance_certificate.html       
│   └── README.md       
├── style       
│   ├── commons     
│   │   ├── action_menu.css     
│   │   ├── buttons.css     
│   │   ├── confirm.css     
│   │   ├── headers.css     
│   │   ├── input_areas.css     
│   │   ├── lists.css       
│   │   ├── navigation.css      
│   │   ├── option_menu.css     
│   │   ├── progress_activity.css       
│   │   ├── softkey.css     
│   │   ├── status.css      
│   │   ├── switches.css        
│   │   └── tabs.css        
│   ├── gaia_icons      
│   │   └── gaia-icons.css     
│   ├── gaia_theme      
│   │   ├── gaia-font.css       
│   │   └── gaia-theme.css      
│   └── README.md       
└── test        
    └── README.md       

