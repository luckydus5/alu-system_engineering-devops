"""
Script to import inventory items from Excel file to Supabase database.
"""
import pandas as pd
import httpx
import os
import uuid
from datetime import datetime

# Supabase configuration
SUPABASE_URL = "https://edumcnnilpnbdxcjpchw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdW1jbm5pbHBuYmR4Y2pwY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzI1ODEsImV4cCI6MjA4MjkwODU4MX0.nRPDvserHqLnNx78UArKHuzJp5J4C0-FT9noHtmXfFU"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def get_departments():
    """Get all departments"""
    response = httpx.get(
        f"{SUPABASE_URL}/rest/v1/departments",
        headers=headers
    )
    print(f"Departments response status: {response.status_code}")
    print(f"Departments response: {response.text[:500]}")
    return response.json()

def get_classifications(department_id):
    """Get classifications for a department"""
    response = httpx.get(
        f"{SUPABASE_URL}/rest/v1/warehouse_classifications",
        headers=headers,
        params={"department_id": f"eq.{department_id}"}
    )
    return response.json()

def get_locations(classification_id):
    """Get locations for a classification"""
    response = httpx.get(
        f"{SUPABASE_URL}/rest/v1/warehouse_locations",
        headers=headers,
        params={"classification_id": f"eq.{classification_id}"}
    )
    return response.json()

def create_classification(department_id, name, color="#6366F1"):
    """Create a new classification"""
    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/warehouse_classifications",
        headers=headers,
        json={
            "department_id": department_id,
            "name": name,
            "color": color
        }
    )
    return response.json()

def create_location(department_id, classification_id, name, parent_id=None):
    """Create a new location/folder"""
    data = {
        "department_id": department_id,
        "classification_id": classification_id,
        "name": name
    }
    if parent_id:
        data["parent_id"] = parent_id
    
    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/warehouse_locations",
        headers=headers,
        json=data
    )
    return response.json()

def generate_item_number():
    """Generate a unique item number"""
    return f"IT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

def insert_inventory_item(item_data):
    """Insert a single inventory item"""
    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/inventory_items",
        headers=headers,
        json=item_data
    )
    if response.status_code >= 400:
        print(f"Error inserting {item_data['item_name']}: {response.text}")
        return None
    return response.json()

def main():
    # Read Excel file
    excel_path = os.path.join(os.path.dirname(__file__), "..", "2026_01_08_10_33_25_tovars_IT equipment and devices.xls")
    df = pd.read_excel(excel_path)
    
    print(f"Found {len(df)} items in Excel file")
    print("Columns:", df.columns.tolist())
    print()
    
    # Get departments and find IT department
    departments = get_departments()
    print("Available departments:")
    for dept in departments:
        print(f"  - {dept['name']} (code: {dept['code']}, id: {dept['id']})")
    
    # Find IT department (look for IT, Information Technology, etc.)
    it_dept = None
    for dept in departments:
        if 'IT' in dept['code'].upper() or 'IT' in dept['name'].upper() or 'INFORMATION' in dept['name'].upper():
            it_dept = dept
            break
    
    if not it_dept:
        print("\nNo IT department found. Creating one...")
        # We can't create department without admin access, so let's use the first available or ask
        print("Please specify which department to use (enter the code):")
        return
    
    print(f"\nUsing department: {it_dept['name']} ({it_dept['id']})")
    
    # Get classifications for this department
    classifications = get_classifications(it_dept['id'])
    print(f"\nExisting classifications for {it_dept['name']}:")
    for cls in classifications:
        print(f"  - {cls['name']} (id: {cls['id']})")
    
    # Find or create "IT Equipment and Devices" classification
    target_classification = None
    for cls in classifications:
        if 'equipment' in cls['name'].lower() or 'device' in cls['name'].lower():
            target_classification = cls
            break
    
    if not target_classification and classifications:
        # Use first available classification
        target_classification = classifications[0]
        print(f"\nUsing classification: {target_classification['name']}")
    elif not target_classification:
        print("\nNo classification found. Creating 'IT Equipment and Devices'...")
        result = create_classification(it_dept['id'], "IT Equipment and Devices", "#3B82F6")
        if result:
            target_classification = result[0] if isinstance(result, list) else result
            print(f"Created classification: {target_classification}")
    
    if not target_classification:
        print("Error: Could not find or create classification")
        return
    
    # Get locations for this classification
    locations = get_locations(target_classification['id'])
    print(f"\nExisting locations in {target_classification['name']}:")
    for loc in locations:
        print(f"  - {loc['name']} (id: {loc['id']})")
    
    # Find or create a location for the items
    target_location = None
    for loc in locations:
        # Find any location to put items in
        target_location = loc
        break
    
    if not target_location:
        print("\nNo location found. Creating 'Main Storage'...")
        result = create_location(it_dept['id'], target_classification['id'], "Main Storage")
        if result:
            target_location = result[0] if isinstance(result, list) else result
            print(f"Created location: {target_location}")
    
    if not target_location:
        print("Error: Could not find or create location")
        return
    
    print(f"\n{'='*60}")
    print(f"Importing items to:")
    print(f"  Department: {it_dept['name']}")
    print(f"  Classification: {target_classification['name']}")
    print(f"  Location: {target_location['name']}")
    print(f"{'='*60}\n")
    
    # Import items
    success_count = 0
    error_count = 0
    
    for index, row in df.iterrows():
        item_name = str(row['Item name']).strip() if pd.notna(row['Item name']) else ""
        quantity = int(row['Quantity']) if pd.notna(row['Quantity']) else 0
        min_quantity = int(row['Min.Quantity']) if pd.notna(row['Min.Quantity']) else 0
        unit = str(row['Unit of Measure']).strip() if pd.notna(row['Unit of Measure']) and str(row['Unit of Measure']) != 'nan' else "pcs"
        
        if not item_name:
            continue
        
        item_data = {
            "department_id": it_dept['id'],
            "classification_id": target_classification['id'],
            "location_id": target_location['id'],
            "item_name": item_name,
            "item_number": generate_item_number(),
            "quantity": quantity,
            "min_quantity": min_quantity,
            "unit": unit if unit != 'nan' else "pcs"
        }
        
        result = insert_inventory_item(item_data)
        if result:
            success_count += 1
            print(f"✓ Imported: {item_name} (qty: {quantity})")
        else:
            error_count += 1
            print(f"✗ Failed: {item_name}")
    
    print(f"\n{'='*60}")
    print(f"Import completed!")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
