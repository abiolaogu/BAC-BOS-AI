#!/usr/bin/env python3
"""
Agent Generator Script
Generates 1,500+ AI agents across various business categories
"""

import json
from typing import List, Dict

# Define agent categories and their subcategories
AGENT_CATEGORIES = {
    "Sales": [
        "Lead Generation", "Lead Qualification", "Proposal Writing", "Contract Negotiation",
        "Account Management", "Pipeline Management", "Forecasting", "Competitor Analysis",
        "Demo Scheduling", "Follow-up Automation", "Objection Handling", "Closing",
        "Upselling", "Cross-selling", "Territory Planning", "Sales Coaching"
    ],
    "Support": [
        "Tier 1 Support", "Tier 2 Support", "Tier 3 Support", "Ticket Routing",
        "Knowledge Base", "SLA Monitoring", "Escalation Management", "Chat Support",
        "Email Support", "Phone Support", "Feedback Collection", "Sentiment Analysis",
        "Refund Processing", "Returns Management", "Warranty Claims", "Technical Support"
    ],
    "HR": [
        "Recruitment", "Resume Screening", "Interview Scheduling", "Onboarding",
        "Offboarding", "Performance Reviews", "Training Coordination", "Benefits Administration",
        "Payroll Support", "Policy Guidance", "Compensation Analysis", "Diversity Tracking",
        "Employee Engagement", "Exit Interviews", "Talent Development", "Succession Planning"
    ],
    "Finance": [
        "Invoicing", "Expense Management", "Budget Planning", "Forecasting",
        "Reconciliation", "Fraud Detection", "Tax Advisory", "Audit Support",
        "Payroll Processing", "Collections", "Cash Flow Management", "Financial Reporting",
        "Investment Analysis", "Cost Optimization", "Risk Management", "Compliance"
    ],
    "Marketing": [
        "Content Creation", "Email Campaigns", "Social Media", "SEO",
        "SEM", "Influencer Marketing", "Brand Monitoring", "Campaign Analysis",
        "Persona Development", "Landing Page Optimization", "A/B Testing", "Market Research",
        "Competitive Intelligence", "Product Launches", "Event Planning", "PR Management"
    ],
    "Legal": [
        "Contract Review", "Compliance", "IP Management", "Privacy",
        "Employment Law", "Corporate Governance", "Litigation Support", "Due Diligence",
        "Policy Drafting", "Regulatory Analysis", "Terms of Service", "NDAs",
        "Document Management", "Legal Research", "Risk Assessment", "Dispute Resolution"
    ],
    "Operations": [
        "Process Optimization", "Workflow Automation", "Inventory Management", "Supply Chain",
        "Logistics", "Quality Control", "Vendor Management", "Facility Management",
        "Asset Tracking", "Maintenance Scheduling", "Capacity Planning", "Production Planning",
        "Resource Allocation", "Project Management", "Change Management", "Risk Management"
    ],
    "IT": [
        "Help Desk", "System Monitoring", "Incident Management", "Change Management",
        "Security Monitoring", "Backup Management", "User Provisioning", "License Management",
        "Network Monitoring", "Performance Tuning", "Disaster Recovery", "Code Review",
        "DevOps", "Cloud Management", "Database Administration", "Cybersecurity"
    ],
    "Product": [
        "Roadmap Planning", "Feature Prioritization", "User Research", "Beta Testing",
        "Product Analytics", "Feedback Analysis", "Competitive Analysis", "Go-to-Market",
        "Product Documentation", "Release Planning", "Requirements Gathering", "Wireframing",
        "A/B Testing", "User Onboarding", "Retention Analysis", "Churn Prediction"
    ],
    "Customer Success": [
        "Onboarding", "Account Health", "Usage Monitoring", "Renewals",
        "Expansion", "Churn Prevention", "Success Planning", "Business Reviews",
        "Training", "Adoption Tracking", "ROI Analysis", "Advocacy",
        "Upsell Identification", "Health Scoring", "Engagement Programs", "Feedback Loops"
    ],
    "Executive": [
        "Strategic Planning", "Board Reporting", "Risk Management", "KPI Tracking",
        "Decision Support", "Market Analysis", "Competitive Intelligence", "M&A Analysis",
        "Investor Relations", "Crisis Management", "Change Leadership", "Culture Building",
        "Innovation Management", "Partnership Development", "Stakeholder Communication", "Vision Setting"
    ],
    "Manufacturing": [
        "Production Scheduling", "Quality Assurance", "Equipment Maintenance", "Lean Manufacturing",
        "Six Sigma", "Root Cause Analysis", "Supplier Quality", "Process Engineering",
        "Safety Compliance", "Yield Optimization", "Waste Reduction", "Capacity Planning",
        "Bill of Materials", "Work Orders", "Inventory Control", "Shop Floor Management"
    ],
    "Retail": [
        "Inventory Planning", "Merchandising", "POS Support", "Loss Prevention",
        "Store Operations", "Customer Experience", "Visual Merchandising", "Pricing Strategy",
        "Promotions", "Loyalty Programs", "Store Performance", "Mall Management",
        "E-commerce Integration", "Omnichannel", "Returns Management", "Store Staffing"
    ],
    "Healthcare": [
        "Patient Scheduling", "Medical Records", "Claims Processing", "Billing",
        "HIPAA Compliance", "Clinical Documentation", "Prescription Management", "Telemedicine Support",
        "Patient Engagement", "Quality Reporting", "Care Coordination", "Population Health",
        "Revenue Cycle", "Credentialing", "Medical Coding", "Lab Results"
    ],
    "Education": [
        "Student Admissions", "Course Scheduling", "Grade Management", "Attendance Tracking",
        "Learning Management", "Student Support", "Career Counseling", "Alumni Relations",
        "Financial Aid", "Curriculum Planning", "Accreditation", "Assessment",
        "Parent Communication", "Campus Safety", "Facilities Booking", "Library Services"
    ],
    "Real Estate": [
        "Property Listing", "Lead Qualification", "Showing Scheduling", "Offer Management",
        "Contract Processing", "Tenant Screening", "Lease Management", "Maintenance Requests",
        "Rent Collection", "Property Valuation", "Market Analysis", "Compliance",
        "Insurance Claims", "HOA Management", "Mortgage Support", "Title Search"
    ],
    "Hospitality": [
        "Reservation Management", "Guest Services", "Housekeeping", "Front Desk",
        "Concierge", "Revenue Management", "Event Planning", "Catering",
        "Loyalty Programs", "Guest Feedback", "Maintenance", "Inventory",
        "Staff Scheduling", "Quality Assurance", "Online Reviews", "Channel Management"
    ],
    "Construction": [
        "Project Planning", "Bid Management", "Site Management", "Safety Compliance",
        "Equipment Scheduling", "Material Procurement", "Quality Inspections", "Change Orders",
        "Progress Tracking", "Budget Management", "Risk Assessment", "Permit Management",
        "Subcontractor Management", "Punch Lists", "As-Built Documentation", "Warranty Management"
    ],
    "Logistics": [
        "Route Optimization", "Fleet Management", "Shipment Tracking", "Warehouse Management",
        "Order Processing", "Carrier Selection", "Freight Auditing", "Returns Management",
        "Customs Documentation", "Delivery Scheduling", "Load Planning", "Driver Management",
        "Asset Tracking", "Inventory Optimization", "Cross-docking", "Last Mile Delivery"
    ],
    "Energy": [
        "Asset Management", "Meter Reading", "Billing", "Outage Management",
        "Grid Operations", "Renewable Integration", "Safety Compliance", "Regulatory Reporting",
        "Customer Service", "Energy Trading", "Demand Forecasting", "Emissions Tracking",
        "Equipment Maintenance", "Project Development", "Environmental Compliance", "Emergency Response"
    ]
}

def generate_agents() -> List[Dict]:
    """Generate 2,000+ AI agents"""
    agents = []
    
    # Define level variants with appropriate models
    variants = [
        ("Junior", "gemini-2.5-flash"),
        ("Standard", "gemini-2.5-pro"),
        ("Senior", "llama-4"),
        ("Lead", "claude-4.5-sonnet"),
        ("Manager", "gemini-3-pro"),
        ("Specialist", "claude-4.5-sonnet"),
        ("Analyst", "gemini-3-ultra"),
        ("Coordinator", "gemini-2.5-flash"),
        ("Director", "claude-4.5-opus"),
        ("VP", "claude-4.5-opus")
    ]
    
    for category, subcategories in AGENT_CATEGORIES.items():
        for subcategory in subcategories:
            # Generate 10 variants for each subcategory
            for level, model in variants:
                # Create a unique ID
                safe_cat = category.lower().replace(" ", "_")
                safe_sub = subcategory.lower().replace(" ", "_")
                safe_level = level.lower()
                agent_id = f"{safe_cat}_{safe_sub}_{safe_level}"
                
                agent = {
                    "id": agent_id,
                    "name": f"{level} {subcategory} Agent",
                    "role": category,
                    "description": f"A {level}-level AI agent specialized in {subcategory} for the {category} department.",
                    "capabilities": [
                        "conversation",
                        "task_execution",
                        f"{safe_sub}_analysis",
                        f"{safe_sub}_reporting"
                    ],
                    "model": model
                }
                agents.append(agent)
    
    return agents

def main():
    import os
    agents = generate_agents()
    output = {
        "version": "1.0",
        "count": len(agents),
        "agents": agents
    }
    
    # Ensure directory exists
    os.makedirs("config", exist_ok=True)
    
    with open("config/agents.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"Successfully generated {len(agents)} agents in config/agents.json")

if __name__ == "__main__":
    main()
