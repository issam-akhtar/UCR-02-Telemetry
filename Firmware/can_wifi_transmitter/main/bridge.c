#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/twai.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "nvs_flash.h"
#include "lwip/sockets.h"
#include <inttypes.h>

#define SERVER_IP   "123.123.123.123"  // <-- Change this to the external IP of the listening computer
#define SERVER_PORT 5000              // <-- Change this to the port you've forwarded
#define TX_GPIO     GPIO_NUM_22
#define RX_GPIO     GPIO_NUM_21

void app_main(void)
{
    printf("ESP32 starting CAN (TWAI) setup...\n");

    // Setup CAN config
    twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT(RX_GPIO, TX_GPIO, TWAI_MODE_NORMAL);
    twai_timing_config_t t_config = TWAI_TIMING_CONFIG_500KBITS();
    twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();

    if (twai_driver_install(&g_config, &t_config, &f_config) != ESP_OK) {
        printf("Failed to install TWAI driver\n");
        return;
    }
    if (twai_start() != ESP_OK) {
        printf("Failed to start TWAI driver\n");
        return;
    }
    printf("CAN receiver loop starting...\n");

    // Socket setup
    int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_IP);
    if (sock < 0) {
        printf("Unable to create socket\n");
        return;
    }

    struct sockaddr_in dest_addr;
    dest_addr.sin_addr.s_addr = inet_addr(SERVER_IP);
    dest_addr.sin_family = AF_INET;
    dest_addr.sin_port = htons(SERVER_PORT);

    printf("Connecting to server %s:%d...\n", SERVER_IP, SERVER_PORT);
    if (connect(sock, (struct sockaddr *)&dest_addr, sizeof(dest_addr)) != 0) {
        printf("Socket connection failed\n");
        close(sock);
        return;
    }
    printf("Connected to server!\n");

    // Receive and forward loop
    while (1) {
        twai_message_t message;
        esp_err_t recv_ret = twai_receive(&message, pdMS_TO_TICKS(1000));
        if (recv_ret == ESP_OK) {
            // Send raw message: [4 bytes ID][1 byte DLC][0-8 bytes data]
            uint8_t tx_buf[13];  // max 4 + 1 + 8
            memset(tx_buf, 0, sizeof(tx_buf));
            tx_buf[0] = (message.identifier >> 24) & 0xFF;
            tx_buf[1] = (message.identifier >> 16) & 0xFF;
            tx_buf[2] = (message.identifier >> 8) & 0xFF;
            tx_buf[3] = (message.identifier) & 0xFF;
            tx_buf[4] = message.data_length_code;
            memcpy(&tx_buf[5], message.data, message.data_length_code);

            int to_send = 5 + message.data_length_code;
            int sent = send(sock, tx_buf, to_send, 0);
            if (sent < 0) {
                printf("Failed to send CAN message to server\n");
            } else {
                printf("Forwarded CAN message: ID=0x%03" PRIX32 ", DLC=%d\n", message.identifier, message.data_length_code);
            }
        } else if (recv_ret == ESP_ERR_TIMEOUT) {
            printf("No CAN message received in last 1 sec.\n");
        } else {
            printf("CAN receive error: %d\n", recv_ret);
        }
    }

    // Clean up
    close(sock);
    twai_driver_uninstall();
}
