# Mumbai Bus Service - Google Sheets Integration

This web application displays bus service information for Mumbai buses, including route numbers, stops, ETAs, and available seats. The data is fetched from a Google Sheet.

## Setup Instructions

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet
2. Name the first sheet "Sheet1" (important: the code looks for this exact name)
3. Add the following headers in the first row:
   - `route_number` - The bus route number
   - `route_name` - The name of the route/destination
   - `stop` - The pickup stop name
   - `eta` - Estimated time of arrival (e.g., "5 mins", "10 mins")
   - `available_seats` - Number of seats available (numeric value)

4. Add some sample data in the rows below the headers. For example:

| route_number | route_name              | stop           | eta    | available_seats |
|--------------|-------------------------|----------------|--------|-----------------|
| BL-112       | Bandra to Lokhandwala   | Andheri West   | 10 mins| 25              |
| VS-45        | Versova to Santacruz    | Juhu          | 5 mins | 12              |
| AM-78        | Andheri to Malad        | Goregaon      | 15 mins| 5               |
| CD-23        | Churchgate to Dadar     | Lower Parel   | 8 mins | 18              |
| BT-56        | Borivali to Thane       | Kandivali     | 20 mins| 30              |

5. Make the sheet public:
   - Click "Share" in the top right
   - Set it to "Anyone with the link can view"
   - Copy the link for the next step

### 2. Get Your Google Sheet ID

1. From the Google Sheet URL, extract the Sheet ID
2. Example URL: `https://docs.google.com/spreadsheets/d/1ABCdefGHIjklMnoPQrsTuVwXyZ/edit`
3. The ID is: `1ABCdefGHIjklMnoPQrsTuVwXyZ`

### 3. Create a Google Cloud Project and Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Sheets API for this project
4. Create API credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API key"
   - Copy the generated API key

### 4. Update the Configuration

1. Open the `js/config.js` file
2. Find the `SHEETS_CONFIG` object
3. Replace `YOUR_SHEET_ID_HERE` with your actual Google Sheet ID
4. Replace `YOUR_API_KEY_HERE` with your actual Google API key
5. Save the file

This separation of configuration allows you to easily update your API details without modifying the main application code.

## Running the Application

Once the setup is complete, the web application will:

1. Fetch data from your Google Sheet
2. Display bus information as cards
3. Allow filtering by pickup stop
4. Automatically refresh the data every minute

The application is built using:
- HTML5
- CSS3 with responsive design
- Vanilla JavaScript (no frameworks)

## Troubleshooting

If you see an error message:

1. Check that your Google Sheet ID is correct
2. Verify your API key is valid and has access to the Google Sheets API
3. Ensure your Google Sheet is public and has the correct structure
4. Check browser console for detailed error messages