import User, { DEPARTMENTS } from '../models/User.js';
import Issue from '../models/Issue.js';
import Vote from '../models/Vote.js';

export const seedInitialData = async () => {
  try {
    const hasSuperAdmin = await User.findOne({ email: 'superadmin@civicconnect.org' });
    if (hasSuperAdmin) {
      console.log('CivicConnect core demo users already seeded.');
      return;
    }

    console.log('Seeding initial CivicConnect database with realistic users and issues...');

    // 1. Create Admins and Citizens
    const usersToCreate = [
      {
        name: 'Super Admin Officer',
        email: 'superadmin@civicconnect.org',
        password: 'Password123!',
        role: 'super_admin',
        department: '',
        phone: '+1 555-0100'
      },
      {
        name: 'Sarah Mitchell (Roads Admin)',
        email: 'roads.admin@civicconnect.org',
        password: 'Password123!',
        role: 'department_admin',
        department: 'Roads and Infrastructure',
        phone: '+1 555-0101'
      },
      {
        name: 'James Reynolds (Water Admin)',
        email: 'water.admin@civicconnect.org',
        password: 'Password123!',
        role: 'department_admin',
        department: 'Water Supply',
        phone: '+1 555-0102'
      },
      {
        name: 'Elena Rostova (Electricity Admin)',
        email: 'electricity.admin@civicconnect.org',
        password: 'Password123!',
        role: 'department_admin',
        department: 'Electricity',
        phone: '+1 555-0103'
      },
      {
        name: 'Carlos Ortiz (Sanitation Admin)',
        email: 'sanitation.admin@civicconnect.org',
        password: 'Password123!',
        role: 'department_admin',
        department: 'Sanitation and Waste Management',
        phone: '+1 555-0104'
      },
      {
        name: 'David Vance (Safety Admin)',
        email: 'safety.admin@civicconnect.org',
        password: 'Password123!',
        role: 'department_admin',
        department: 'Public Safety',
        phone: '+1 555-0105'
      },
      {
        name: 'Maya Lin (Lighting Admin)',
        email: 'lighting.admin@civicconnect.org',
        password: 'Password123!',
        role: 'department_admin',
        department: 'Street Lighting',
        phone: '+1 555-0106'
      },
      {
        name: 'Marcus Thorne (Drainage Admin)',
        email: 'drainage.admin@civicconnect.org',
        password: 'Password123!',
        role: 'department_admin',
        department: 'Drainage',
        phone: '+1 555-0107'
      },
      {
        name: 'Bairla Yeshwanth',
        email: 'yeshwanth3006@gmail.com',
        password: 'Password123!',
        role: 'super_admin',
        department: '',
        phone: '+1 555-0108'
      },
      {
        name: 'Government Super Admin',
        email: 'admin@gov.com',
        password: 'Password123!',
        role: 'super_admin',
        department: '',
        phone: '+1 555-0109'
      },
      {
        name: 'Platform Administrator',
        email: 'admin@gmail.com',
        password: 'Password123!',
        role: 'super_admin',
        department: '',
        phone: '+1 555-0110'
      },
      {
        name: 'Alex Johnson',
        email: 'alex.citizen@gmail.com',
        password: 'Password123!',
        role: 'citizen',
        phone: '+1 555-0201'
      },
      {
        name: 'Priya Sharma',
        email: 'priya.civic@gmail.com',
        password: 'Password123!',
        role: 'citizen',
        phone: '+1 555-0202'
      },
      {
        name: 'Marcus Vance',
        email: 'marcus.v@gmail.com',
        password: 'Password123!',
        role: 'citizen',
        phone: '+1 555-0203'
      },
      {
        name: 'Test Citizen',
        email: 'citizen@test.com',
        password: 'Password123!',
        role: 'citizen',
        phone: '+1 555-0204'
      }
    ];

    const createdUsers = [];
    for (const u of usersToCreate) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        existing = await User.create(u);
      }
      createdUsers.push(existing);
    }
    const superAdmin = createdUsers.find((u) => u.role === 'super_admin');
    const roadsAdmin = createdUsers.find((u) => u.department === 'Roads and Infrastructure');
    const waterAdmin = createdUsers.find((u) => u.department === 'Water Supply');
    const electricityAdmin = createdUsers.find((u) => u.department === 'Electricity');
    const sanitationAdmin = createdUsers.find((u) => u.department === 'Sanitation and Waste Management');
    const alex = createdUsers.find((u) => u.email === 'alex.citizen@gmail.com');
    const priya = createdUsers.find((u) => u.email === 'priya.civic@gmail.com');
    const marcus = createdUsers.find((u) => u.email === 'marcus.v@gmail.com');

    console.log(`Core user & admin accounts verified (${createdUsers.length} accounts).`);

    // Only seed sample complaints if explicitly requested via environment variable
    if (process.env.SEED_SAMPLE_ISSUES !== 'true') {
      console.log('Skipping sample complaints creation (SEED_SAMPLE_ISSUES is not enabled). Database ready with users & admins.');
      return;
    }

    // Sample Issues coordinates centered around San Francisco / Bay area (37.7749, -122.4194)
    // GeoJSON: [longitude, latitude]
    const sampleIssues = [
      {
        title: 'Deep Hazardous Pothole on Market & 5th St',
        description: 'Large crater approximately 12 inches deep in the second traffic lane. Two vehicles have already suffered rim damage. High traffic hazard during peak hours.',
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        category: 'Pothole',
        department: 'Roads and Infrastructure',
        severity: 'High',
        status: 'In Progress',
        location: {
          type: 'Point',
          coordinates: [-122.4075, 37.7831]
        },
        address: '501 Market Street, Financial District',
        reportedBy: alex._id,
        assignedTo: roadsAdmin._id,
        votes: 14,
        supporters: [alex._id, priya._id, marcus._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: alex._id,
            updatedByName: alex.name,
            note: 'Reported with photograph.',
            timestamp: new Date(Date.now() - 5 * 86400000)
          },
          {
            status: 'Verified',
            updatedBy: roadsAdmin._id,
            updatedByName: roadsAdmin.name,
            note: 'Field supervisor verified depth and safety hazard.',
            timestamp: new Date(Date.now() - 3 * 86400000)
          },
          {
            status: 'In Progress',
            updatedBy: roadsAdmin._id,
            updatedByName: roadsAdmin.name,
            note: 'Asphalt resurfacing crew dispatched for overnight patch work.',
            timestamp: new Date(Date.now() - 1 * 86400000)
          }
        ],
        aiAnalysis: {
          confidence: 0.96,
          suggestedTitle: 'Pothole on Asphalt Roadway',
          suggestedDepartment: 'Roads and Infrastructure',
          suggestedSeverity: 'High',
          summary: 'Severe road depression posing collision and tire damage risks.',
          detectedTags: ['pothole', 'traffic_risk', 'asphalt']
        }
      },
      {
        title: 'High Pressure Water Main Burst on Pine Street',
        description: 'Clean municipal water gushing onto sidewalk and roadway from cracked main line. Water pressure in adjacent residential buildings has dropped severely.',
        imageUrl: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop&q=80',
        category: 'Water Leak',
        department: 'Water Supply',
        severity: 'Critical',
        status: 'Verified',
        location: {
          type: 'Point',
          coordinates: [-122.4112, 37.791]
        },
        address: '840 Pine Street, Nob Hill',
        reportedBy: priya._id,
        assignedTo: waterAdmin._id,
        votes: 27,
        supporters: [alex._id, priya._id, marcus._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: priya._id,
            updatedByName: priya.name,
            note: 'Urgent citizen report: flooding sidewalk.',
            timestamp: new Date(Date.now() - 2 * 86400000)
          },
          {
            status: 'Verified',
            updatedBy: waterAdmin._id,
            updatedByName: waterAdmin.name,
            note: 'Emergency valve isolation team on route.',
            timestamp: new Date(Date.now() - 1 * 86400000)
          }
        ],
        aiAnalysis: {
          confidence: 0.95,
          suggestedTitle: 'Major Water Pipe Rupture',
          suggestedDepartment: 'Water Supply',
          suggestedSeverity: 'Critical',
          summary: 'Continuous water loss eroding pavement foundation.',
          detectedTags: ['flooding', 'pipe_burst', 'water_loss']
        }
      },
      {
        title: 'Downed Live Electrical Cable Near Bus Stop',
        description: 'Overhead electrical power line snapped and is dangling 3 feet above sidewalk next to Muni bus shelter. Sparks observed intermittently.',
        imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
        category: 'Electrical Hazard',
        department: 'Electricity',
        severity: 'Critical',
        status: 'Reported',
        location: {
          type: 'Point',
          coordinates: [-122.4185, 37.7765]
        },
        address: '1200 Mission St at 8th St, SoMa',
        reportedBy: marcus._id,
        assignedTo: electricityAdmin._id,
        votes: 38,
        supporters: [alex._id, priya._id, marcus._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: marcus._id,
            updatedByName: marcus.name,
            note: 'Citizens keeping pedestrians away from dangling cable.',
            timestamp: new Date(Date.now() - 4 * 3600000)
          }
        ],
        aiAnalysis: {
          confidence: 0.98,
          suggestedTitle: 'Exposed High Voltage Wire',
          suggestedDepartment: 'Electricity',
          suggestedSeverity: 'Critical',
          summary: 'Extreme life safety hazard from energized electrical line.',
          detectedTags: ['electrocution_hazard', 'live_wire', 'public_danger']
        }
      },
      {
        title: 'Overflowing Commercial Trash Bins Blocking Alleyway',
        description: 'Excessive solid waste and rotting food rubbish spilling out onto pedestrian passageway. Attracting pests and creating unpleasant stench.',
        imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
        category: 'Waste Overflow',
        department: 'Sanitation and Waste Management',
        severity: 'Medium',
        status: 'Resolved',
        location: {
          type: 'Point',
          coordinates: [-122.4048, 37.7952]
        },
        address: 'Grant Ave & Commercial St, Chinatown',
        reportedBy: alex._id,
        assignedTo: sanitationAdmin._id,
        votes: 8,
        supporters: [alex._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: alex._id,
            updatedByName: alex.name,
            note: 'Reported by local resident.',
            timestamp: new Date(Date.now() - 10 * 86400000)
          },
          {
            status: 'Verified',
            updatedBy: sanitationAdmin._id,
            updatedByName: sanitationAdmin.name,
            note: 'Inspector confirmed commercial violation.',
            timestamp: new Date(Date.now() - 8 * 86400000)
          },
          {
            status: 'In Progress',
            updatedBy: sanitationAdmin._id,
            updatedByName: sanitationAdmin.name,
            note: 'Sanitation sweep truck dispatched.',
            timestamp: new Date(Date.now() - 7 * 86400000)
          },
          {
            status: 'Resolved',
            updatedBy: sanitationAdmin._id,
            updatedByName: sanitationAdmin.name,
            note: 'Debris completely cleared and pressure washed. Merchant cited.',
            timestamp: new Date(Date.now() - 6 * 86400000)
          }
        ],
        resolutionNotes: 'Commercial alleyway cleared, sanitized, and washed by municipal sanitation crew #4.',
        resolutionImageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
        aiAnalysis: {
          confidence: 0.92,
          suggestedTitle: 'Solid Waste Overflow',
          suggestedDepartment: 'Sanitation and Waste Management',
          suggestedSeverity: 'Medium',
          summary: 'Accumulation of uncontained domestic/commercial waste.',
          detectedTags: ['garbage', 'sanitation', 'litter']
        }
      },
      {
        title: 'Broken Streetlamp Cluster Leaving Park Perimeter Dark',
        description: 'Three consecutive decorative streetlights along the park walkway have failed. Path is completely unlit creating safety and visibility hazards after dark.',
        imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80',
        category: 'Streetlight Out',
        department: 'Street Lighting',
        severity: 'Medium',
        status: 'In Progress',
        location: {
          type: 'Point',
          coordinates: [-122.428, 37.769]
        },
        address: 'Dolores Park Perimeter Path, Mission District',
        reportedBy: priya._id,
        assignedTo: roadsAdmin._id,
        votes: 19,
        supporters: [priya._id, marcus._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: priya._id,
            updatedByName: priya.name,
            note: 'Night walkers report pitch black walkway.',
            timestamp: new Date(Date.now() - 4 * 86400000)
          },
          {
            status: 'Verified',
            updatedBy: superAdmin._id,
            updatedByName: superAdmin.name,
            note: 'Photocell sensor fault confirmed.',
            timestamp: new Date(Date.now() - 2 * 86400000)
          },
          {
            status: 'In Progress',
            updatedBy: superAdmin._id,
            updatedByName: superAdmin.name,
            note: 'Replacement LED driver fixtures scheduled.',
            timestamp: new Date(Date.now() - 1 * 86400000)
          }
        ]
      },
      {
        title: 'Missing Storm Drain Grate on 16th Street',
        description: 'The cast iron storm water drain cover is missing or fallen into the catch basin, leaving an open 2x3 foot pit in the bicycle lane.',
        imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80',
        category: 'Drainage Issue',
        department: 'Drainage',
        severity: 'Critical',
        status: 'Verified',
        location: {
          type: 'Point',
          coordinates: [-122.4195, 37.765]
        },
        address: '3200 16th Street, Mission District',
        reportedBy: marcus._id,
        assignedTo: roadsAdmin._id,
        votes: 31,
        supporters: [alex._id, priya._id, marcus._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: marcus._id,
            updatedByName: marcus.name,
            note: 'Cyclist almost fell into open hole.',
            timestamp: new Date(Date.now() - 1 * 86400000)
          },
          {
            status: 'Verified',
            updatedBy: roadsAdmin._id,
            updatedByName: roadsAdmin.name,
            note: 'Traffic cones placed immediately around pit as interim safety measure.',
            timestamp: new Date(Date.now() - 12 * 3600000)
          }
        ]
      },
      {
        title: 'Damaged Guardrail on Steep Curve Hillside',
        description: 'Vehicular impact has collapsed 25 feet of corrugated steel safety barrier. Drop-off below exceeds 40 feet.',
        imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
        category: 'Guardrail Damage',
        department: 'Public Safety',
        severity: 'High',
        status: 'In Progress',
        location: {
          type: 'Point',
          coordinates: [-122.4444, 37.7554]
        },
        address: 'Twin Peaks Blvd at Panorama Drive',
        reportedBy: alex._id,
        assignedTo: superAdmin._id,
        votes: 11,
        supporters: [alex._id, priya._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: alex._id,
            updatedByName: alex.name,
            note: 'Accident aftermath debris present.',
            timestamp: new Date(Date.now() - 6 * 86400000)
          },
          {
            status: 'Verified',
            updatedBy: superAdmin._id,
            updatedByName: superAdmin.name,
            note: 'Structural barrier integrity compromised.',
            timestamp: new Date(Date.now() - 5 * 86400000)
          },
          {
            status: 'In Progress',
            updatedBy: superAdmin._id,
            updatedByName: superAdmin.name,
            note: 'Contractor ordering replacement galvanized posts and rail.',
            timestamp: new Date(Date.now() - 2 * 86400000)
          }
        ]
      },
      {
        title: 'Severely Broken Concrete Sidewalk Slab',
        description: 'Tree roots have uplifted the concrete sidewalk slab by over 4 inches, creating an inaccessible tripping hazard for elderly pedestrians and wheelchairs.',
        imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
        category: 'Sidewalk Defect',
        department: 'Roads and Infrastructure',
        severity: 'Medium',
        status: 'Reported',
        location: {
          type: 'Point',
          coordinates: [-122.435, 37.785]
        },
        address: '1940 Fillmore Street, Pacific Heights',
        reportedBy: priya._id,
        votes: 6,
        supporters: [priya._id],
        statusHistory: [
          {
            status: 'Reported',
            updatedBy: priya._id,
            updatedByName: priya.name,
            note: 'Pedestrian trip reported by community neighbor.',
            timestamp: new Date(Date.now() - 3 * 86400000)
          }
        ]
      }
    ];

    const createdIssues = await Issue.create(sampleIssues);

    // Create Vote records to keep data model consistent
    const votesToCreate = [];
    createdIssues.forEach((issue) => {
      (issue.supporters || []).forEach((userId) => {
        votesToCreate.push({
          user: userId,
          issue: issue._id,
          createdAt: new Date()
        });
      });
    });

    if (votesToCreate.length > 0) {
      await Vote.create(votesToCreate);
    }

    console.log(`Seeding complete: ${createdUsers.length} users and ${createdIssues.length} issues created with full history and votes.`);
  } catch (err) {
    console.error('Error during data seeding:', err);
  }
};
