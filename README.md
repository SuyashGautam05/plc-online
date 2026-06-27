# Programmable Logic Controller (PLC) Simulation Software

A comprehensive desktop application built with Electron providing interactive learning and simulation of Programmable Logic Controllers (PLCs) and Industrial Automation systems. This software delivers structured course content covering PLC fundamentals, hardware architecture, programming, and advanced automation technologies.

## Features

### Course Content (17 Comprehensive Modules)
- **Introduction to Industrial Automation** - Definition, scope, automation pyramid, tools, and evolution
- **Industrial Safety and Standards** - Safety systems, emergency stops, interlocks, and compliance
- **Basics of Electrical Engineering** - DC/AC circuits, three-phase systems, power factor, and schematics
- **Industrial Electrical Components** - Circuit breakers, power supplies, relays, contactors, and switches
- **Transducers, Sensors and Transmitters** - Proximity sensors, temperature, pressure, level, and flow sensors
- **Actuators** - Motors (AC, DC, stepper, servo), pneumatic and hydraulic actuators
- **Industrial Control Panels** - Panel design, components, and implementation
- **PLC Fundamentals** - Basics, advantages, and principles
- **PLC Hardware and Architecture** - Components, input/output modules, and system architecture
- **PLC Programming** - Ladder logic, function blocks, structured text, and simulation
- **Human Machine Interface (HMI)** - Functions, design, and implementation
- **SCADA Systems** - Supervisory control, data acquisition, and monitoring
- **Variable Frequency Drives (VFD)** - Drive operation and motor control
- **Distributed Control Systems (DCS)** - Architecture and comparison with PLCs
- **Industrial Communication Networks** - Networking, protocols, and integration
- **Advanced Automation & Industry 5.0** - Smart sensors, human-machine collaboration
- **Advanced Automation Technologies** - AI, IoT, digital twins, AR/VR, and cybersecurity

### Application Features
- **Hardware Key Protection** - USB dongle-based license verification system
- **Searchable Content** - Quick search functionality across all course topics
- **Expandable Menu System** - Collapsible sections with nested subtopics
- **Responsive Interface** - Works on desktop and tablet displays
- **Developer Tools Protection** - Enhanced security to prevent unauthorized access
- **Offline Access** - Complete course content available locally

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Framework**: Electron
- **License Management**: USB Detection, SHA-256 Encryption
- **Build Tool**: Electron Builder
- **Styling**: CSS with responsive design
- **Storage**: Electron Local Storage

## Project Structure

```
PLC-Simtel/
├── index.html              # Main application menu
├── main.js                 # Electron main process & license validation
├── preload.js              # Secure context bridge
├── renderer.js             # Frontend interactivity
├── style.css               # Application styling
├── package.json            # Dependencies and build config
├── assets/                 # Images and logos
├── pages/                  # Course content HTML pages
│   ├── Introduction to Industrial Automation/
│   ├── Industrial Safety and Standards/
│   ├── Basics of Electrical Engineering for Automation/
│   ├── Industrial Electrical Components/
│   ├── Transducers, Sensors and Transmitters/
│   ├── Actuators/
│   ├── Introduction to Control Panels/
│   ├── Introduction to PLC/
│   ├── PLC Hardware and Architecture/
│   ├── PLC Programming Fundamentals/
│   ├── Human Machine Interface/
│   ├── Supervisory Control and Data Acquisition/
│   ├── Variable Frequency Drives/
│   ├── Distributed Control Systems/
│   ├── Industrial Communication Networks/
│   ├── Advanced Automation & Industry 5.0/
│   └── Advanced Automation Technologies/
└── validate/               # License verification interface
    ├── Index.html
    ├── Script.js
    └── Styles.css
```

## Prerequisites

To develop and run the PLC Simulation Software:

- [Node.js](https://nodejs.org/en) (v14 or higher)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [git](https://git-scm.com/downloads)
- Valid license file (.key) generated from hardware key
- USB hardware key for application authentication

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nvis-technologies/PLC-Simtel.git
   cd PLC-Simtel
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Generate License File:**
   - Insert USB hardware key into computer
   - A license key will be generated based on the device serial number

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Build for Distribution:**
   ```bash
   npm run build-win        # Windows
   npm run build-mac        # macOS
   npm run build-linux      # Linux
   ```

## Usage

1. **Launch the Application**
   - Run `npm start` or open the installed application
   - The license verification screen will appear on first run

2. **License Verification**
   - Insert the USB hardware key into your computer
   - Select the license (.key) file
   - Click "Next" to verify

3. **Navigate Course Content**
   - Browse 17 comprehensive modules from the main menu
   - Use the search bar to quickly find topics
   - Click section headers to expand/collapse topics
   - Click on links to view detailed course material

4. **Learning Path**
   - Start with "Introduction to Industrial Automation"
   - Progress through fundamentals to advanced topics
   - Each module builds on previous knowledge
   - Includes diagrams, simulations, and practical examples

## Security Features

- **Context Isolation** - Prevents unauthorized access to Node.js APIs
- **Hardware Key Validation** - License tied to specific USB device
- **USB Monitoring** - Automatic re-validation if device is added/removed
- **Developer Tools Protection** - Blocks access to browser console and inspector
- **Navigation Prevention** - Prevents bypass attempts through drag-and-drop
- **Encrypted License Keys** - SHA-256 hash-based authentication

## System Requirements

- **OS**: Windows 7+, macOS 10.12+, Linux (Ubuntu 18.04+)
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 500MB for application and course content
- **Display**: Minimum 1024x768 resolution
- **USB Port**: Required for hardware key

## Support & Documentation

For detailed course information and learning resources, refer to the course content within the application. Each module includes:
- Comprehensive topic explanations
- Practical applications
- Industry standards and best practices
- Real-world examples

## License

This project is licensed under the NVIS Technology - END USER LICENSE AGREEMENT - see the [license.md](license.md) file for details.

## Author

**Suyash Gautam** - [@Suyash Gautam](https://www.linkedin.com/in/suyash-gautam/)

## Company

**NVIS Technologies** - Industrial Automation & Control Systems Education