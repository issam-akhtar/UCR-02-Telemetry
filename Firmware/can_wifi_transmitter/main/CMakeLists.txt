idf_component_register(SRCS "hello_world_main.c"
                    PRIV_REQUIRES spi_flash driver esp_wifi nvs_flash
                    INCLUDE_DIRS "")
