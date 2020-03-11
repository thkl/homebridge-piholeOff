# Homebridge Pi-hole (off Version)

[Pi-hole](https://github.com/pi-hole/pi-hole) plugin for Homebridge

## Requirements

-   [Homebridge](https://github.com/nfarina/homebridge) - *HomeKit support for the impatient*
-   [Pi-hole](https://github.com/pi-hole/pi-hole) - *A black hole for Internet advertisements*

## Installation

1.  Install this plugin `npm install -g homebridge-piholeOff`
2.  Update your configuration file. See sample-config.json in this repository for a sample.

See the Pi-hole [installation section](https://github.com/pi-hole/pi-hole#one-step-automated-install) for more details.

## Configuration

There are four options:

-   `name` Required. Accessory name, default is *PiholeOff*.
-   `auth` Pi-hole auth token.
-   `host` Pi-hole host, default is `localhost`.
-   `port` Pi-hole port, default is `80`.
-   `time` Default Off time, you are able to change this in Homekit
-   `logLevel` Logging level, three different levels: 0: logging disabled, 1: logs only HTTP errors, 2: logs each HTTP response. Default is set to 1.

See the [sample-config.json](sample-config.json) file to see an example of how to configure the accessory. 
This plugin will do the oppisite of the original [homebridge-pihole](https://github.com/arendruni/homebridge-pihole) . It will setup a Homekit Switch. 
This switch has optional characteristics for the duration time.
You are able to set this time as a default or every time you turn on the switch (and turn off pihole). Note: the duration set time and the time the switch remains on (and the pi-hole off) is only visible in the eve app. The Apple Home App will not show you this settings. But it will turn off the switch (and turn on pi-hole) as well.

## How to get a Pi-hole authentication token

1.  Login into your Pi-hole Admin Console.
2.  Navigate to the *Settings* page and then to the *API / Web interface* tab.
3.  At the bottom of the page click on the *Show API Token* button, a popup window will ask for confirmation, go ahead and click on *Yes, show API token*.
4.  A new window will open showing a QR code, copy the *Raw API Token* below the QR code.
5.  Paste your API token in the homebridge configuration file.

## Licence

(The MIT License)

Copyright (c) 2020

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
