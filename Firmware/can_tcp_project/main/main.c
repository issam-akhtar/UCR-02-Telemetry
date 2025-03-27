#include <stdio.h>
#include <string.h>
#include "esp_mac.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_log.h"
#include "lwip/sockets.h"
#include "driver/twai.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <inttypes.h>
#include "driver/gpio.h"
#include "hal/gpio_types.h"

#define NET_LED GPIO_NUM_25
#define WIFI_SSID "Izzum"
#define WIFI_PASS "samujani1"
#define SERVER_IP "10.0.0.103" // Change this to your server's IP
#define SERVER_PORT 5000

static const char *TAG = "CAN_TCP";

int tcp_socket = -1;
// Configure the GPIO pin

static void config_led()
{
    gpio_config_t io_conf;
    io_conf.intr_type = GPIO_INTR_DISABLE;        // Disable interrupt
    io_conf.mode = GPIO_MODE_OUTPUT;              // Set as output mode
    io_conf.pin_bit_mask = (1ULL << NET_LED);     // Bit mask of the pin
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE; // Disable pull-down mode
    io_conf.pull_up_en = GPIO_PULLUP_DISABLE;     // Disable pull-up mode
    gpio_config(&io_conf);
}

// WiFi Event Handler
static void wifi_event_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data)
{
    if (event_id == WIFI_EVENT_STA_START)
    {
        esp_wifi_connect();
    }
    else if (event_id == WIFI_EVENT_STA_DISCONNECTED)
    {
        ESP_LOGE(TAG, "Disconnected, retrying...");
        esp_wifi_connect();
    }
    else if (event_id == IP_EVENT_STA_GOT_IP)
    {
        ESP_LOGI(TAG, "Connected to WiFi!");
    }
}

// WiFi Initialization
void wifi_init()
{
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
        },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
}

// Connect to TCP Server
void connect_tcp()
{
    struct sockaddr_in server_addr;
    server_addr.sin_addr.s_addr = inet_addr(SERVER_IP);
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(SERVER_PORT);

    tcp_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (tcp_socket < 0)
    {
        ESP_LOGE(TAG, "Socket creation failed");
        return;
    }

    if (connect(tcp_socket, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
    {
        ESP_LOGE(TAG, "Failed to connect to server");
        close(tcp_socket);
        tcp_socket = -1;
        return;
    }

    ESP_LOGI(TAG, "Connected to TCP Server");
}

// Initialize CAN (TWAI)
void can_init()
{
    twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT(GPIO_NUM_21, GPIO_NUM_22, TWAI_MODE_NORMAL);
    twai_timing_config_t t_config = TWAI_TIMING_CONFIG_500KBITS();
    twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();

    ESP_ERROR_CHECK(twai_driver_install(&g_config, &t_config, &f_config));
    ESP_ERROR_CHECK(twai_start());
}

// CAN Receiver Task
void can_receive_task(void *arg)
{
    twai_message_t message;
    while (1)
    {
        if (twai_receive(&message, pdMS_TO_TICKS(1000)) == ESP_OK)
        {
            ESP_LOGI(TAG, "Received CAN ID: %" PRIX32 ", Data: %02X %02X %02X %02X %02X %02X %02X %02X",
                     message.identifier, message.data[0], message.data[1], message.data[2], message.data[3],
                     message.data[4], message.data[5], message.data[6], message.data[7]);

            if (tcp_socket > 0)
            {
                send(tcp_socket, message.data, message.data_length_code, 0);
            }
        }
    }
}

// Main Application
void app_main()
{
    config_led();
    wifi_init();
    vTaskDelay(pdMS_TO_TICKS(5000)); // Allow WiFi to connect
    connect_tcp();
    printf("Waiting for CAN");
    can_init();

    xTaskCreate(can_receive_task, "can_receive_task", 4096, NULL, 5, NULL);
}
