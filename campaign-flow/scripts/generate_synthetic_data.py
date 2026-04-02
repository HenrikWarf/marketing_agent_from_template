import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from google.cloud import bigquery
import os

# Configuration
PROJECT_ID = "marketing-agent-01-491314"
DATASET_ID = "customer_data_furniture"
NUM_SALES = 5000

client = bigquery.Client(project=PROJECT_ID)

def generate_products():
    print("Generating Products...")
    categories = ["Living Room", "Bedroom", "Kitchen", "Office", "Outdoor", "Lighting", "Storage", "Textiles", "Bathroom", "Decoration"]
    names = ["SÏTZY", "SLËËPY", "KÖÖK", "WÖRK", "FRËSH", "BRÏGHT", "STÖW", "SÖFT", "SPLÄSH", "CÖZY"]
    
    products = []
    for i in range(50):
        cat = random.choice(categories)
        base_name = names[categories.index(cat)]
        p_id = f"prod_{i:03d}"
        price = round(random.uniform(19.99, 1299.99), 2)
        cost = round(price * random.uniform(0.3, 0.6), 2)
        
        # Reality injection: Low stock on some items
        if "SÏTZY" in base_name and i % 5 == 0:
            stock = random.randint(0, 5)
        else:
            stock = random.randint(10, 500)
            
        products.append({
            "product_id": p_id,
            "name": f"{base_name} {random.choice(['Alpha', 'Beta', 'Max', 'Pro', 'Classic'])}",
            "category": cat,
            "price": price,
            "cost": cost,
            "inventory_level": stock,
            "margin": round(price - cost, 2)
        })
    return pd.DataFrame(products)

def generate_sales(df_products):
    print("Generating Sales Transactions...")
    # Fetch customer IDs from BQ
    query = f"SELECT customer_id FROM `{PROJECT_ID}.{DATASET_ID}.customer`"
    cust_ids = client.query(query).to_dataframe()['customer_id'].tolist()
    
    sales = []
    start_date = datetime.now() - timedelta(days=365)
    
    for i in range(NUM_SALES):
        prod = df_products.sample(1).iloc[0]
        cust_id = random.choice(cust_ids)
        date = start_date + timedelta(days=random.randint(0, 365), hours=random.randint(0, 23))
        qty = random.randint(1, 3)
        
        # Reality injection: Weekends have 20% higher sales
        if date.weekday() >= 5:
            if random.random() < 0.2: i += 1 # slight boost
            
        sales.append({
            "transaction_id": f"tx_{i:06d}",
            "customer_id": cust_id,
            "product_id": prod['product_id'],
            "date": date,
            "quantity": qty,
            "total_amount": round(prod['price'] * qty, 2),
            "discount_applied": random.choice([0, 0, 0, 0.1, 0.2]) # 20% of sales have discount
        })
    return pd.DataFrame(sales)

def generate_historical_campaigns():
    print("Generating Historical Campaigns...")
    types = ["Email", "SMS", "Social", "Display"]
    campaigns = []
    
    for i in range(20):
        c_type = random.choice(types)
        spend = random.uniform(500, 5000)
        
        # Reality injection: Social has better ROI for quirky brands
        roi_multiplier = 1.5 if c_type == "Social" else 1.0
        conversions = int((spend / random.uniform(5, 15)) * roi_multiplier)
        
        campaigns.append({
            "campaign_id": f"camp_{i:03d}",
            "campaign_name": f"Season {random.choice(['Spring', 'Summer', 'Winter'])} {c_type} Push",
            "media_type": c_type,
            "spend": round(spend, 2),
            "conversions": conversions,
            "revenue": round(conversions * random.uniform(50, 150), 2),
            "start_date": datetime.now() - timedelta(days=random.randint(30, 300))
        })
    return pd.DataFrame(campaigns)

def upload_to_bq(df, table_name):
    table_id = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
    job_config = bigquery.LoadJobConfig(write_disposition="WRITE_TRUNCATE")
    print(f"Uploading {table_name} to {table_id}...")
    client.load_table_from_dataframe(df, table_id, job_config=job_config).result()
    print(f"Table {table_name} uploaded successfully.")

if __name__ == "__main__":
    df_products = generate_products()
    df_sales = generate_sales(df_products)
    df_campaigns = generate_historical_campaigns()
    
    upload_to_bq(df_products, "products")
    upload_to_bq(df_sales, "sales")
    upload_to_bq(df_campaigns, "campaign_history")
    
    print("\nSUCCESS: All synthetic data generated and uploaded to BigQuery.")
    print("Opportunities injected:")
    print("1. Low stock on 'SÏTZY' products (check products table)")
    print("2. Higher ROI on 'Social' media (check campaign_history)")
    print("3. Transactions linked to existing customers for churn analysis.")
