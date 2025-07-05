/**
 * Setup Organizations Script for AITO Check
 *
 * This script helps set up sample organizations in Firebase Firestore
 * for testing the AITO Check app.
 *
 * Usage:
 * 1. Make sure you have Firebase Admin SDK configured
 * 2. Run: node scripts/setupOrganizations.js
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// You'll need to add your service account key file
const serviceAccount = require("../path/to/your/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://aito-manage-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.firestore();

// Sample organizations data
const organizations = [
  {
    id: "BSIT_Dept",
    info: {
      name: "BSIT Department",
      logo_url: null, // Add your logo URL here
      icon: "BookOpen",
      description: "Bachelor of Science in Information Technology Department",
    },
  },
  {
    id: "Nursing_Dept",
    info: {
      name: "Nursing Department",
      logo_url: null, // Add your logo URL here
      icon: "Users",
      description: "Bachelor of Science in Nursing Department",
    },
  },
  {
    id: "Student_Council",
    info: {
      name: "Student Council",
      logo_url: null, // Add your logo URL here
      icon: "GraduationCap",
      description: "Batanes State College Student Council",
    },
  },
  {
    id: "Admin_Office",
    info: {
      name: "Admin Office",
      logo_url: null, // Add your logo URL here
      icon: "Building",
      description: "Administrative Office",
    },
  },
  {
    id: "Library",
    info: {
      name: "Library",
      logo_url: null, // Add your logo URL here
      icon: "BookOpen",
      description: "Batanes State College Library",
    },
  },
  {
    id: "Cafeteria",
    info: {
      name: "Cafeteria",
      logo_url: null, // Add your logo URL here
      icon: "Users",
      description: "Student Cafeteria and Food Services",
    },
  },
];

async function setupOrganizations() {
  try {
    console.log("🚀 Starting organization setup...");

    for (const org of organizations) {
      console.log(`📝 Setting up ${org.info.name}...`);

      // Create the organization document
      const orgRef = db.collection("organizations").doc(org.id);

      // Create the info subcollection
      const infoRef = orgRef.collection("info").doc("details");

      await infoRef.set(org.info);

      console.log(`✅ ${org.info.name} setup complete`);
    }

    console.log("🎉 All organizations setup complete!");
    console.log("\n📋 Organizations created:");
    organizations.forEach((org) => {
      console.log(`   - ${org.info.name} (${org.id})`);
    });
  } catch (error) {
    console.error("❌ Error setting up organizations:", error);
  } finally {
    process.exit(0);
  }
}

// Alternative: Manual setup instructions
function showManualSetupInstructions() {
  console.log(`
📋 Manual Setup Instructions for Organizations

If you prefer to set up organizations manually through Firebase Console:

1. Go to Firebase Console > Firestore Database
2. Create a collection called "organizations"
3. For each organization, create a document with the ID (e.g., "BSIT_Dept")
4. Inside each organization document, create a subcollection called "info"
5. In the "info" subcollection, create a document with the following fields:

   Field Name    | Type    | Value Example
   --------------|---------|------------------
   name          | String  | "BSIT Department"
   logo_url      | String  | "https://your-url/logo.png" (optional)
   icon          | String  | "BookOpen"
   description   | String  | "Department description" (optional)

6. Repeat for all organizations:
   - BSIT_Dept
   - Nursing_Dept
   - Student_Council
   - Admin_Office
   - Library
   - Cafeteria

Available Icons:
- BookOpen
- Users
- GraduationCap
- Building
- Shield

After setup, the app will automatically load these organizations on the landing page.
`);
}

// Check if running the script or showing instructions
if (require.main === module) {
  // Check if service account is available
  try {
    require("../path/to/your/serviceAccountKey.json");
    setupOrganizations();
  } catch (error) {
    console.log(
      "⚠️  Service account key not found. Showing manual setup instructions...\n"
    );
    showManualSetupInstructions();
  }
}

module.exports = {
  setupOrganizations,
  showManualSetupInstructions,
};
