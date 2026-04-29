import sqlite3
import json
import os

def migrate():
    db_path = 'campaigns.db'
    if not os.path.exists(db_path):
        print("Database not found. Nothing to migrate.")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT id, content_json FROM campaigns")
    rows = cursor.fetchall()

    updated_count = 0
    for row in rows:
        campaign_id = row['id']
        try:
            content = json.loads(row['content_json'])
            if 'content_drafts' in content:
                modified = False
                for draft in content['content_drafts']:
                    # Find the content field using our fallback logic
                    source_keys = ['content', 'copy', 'body', 'text', 'post_text', 'video_concept', 'message']
                    
                    # If text_content is already there and not empty, we are good
                    if 'text_content' in draft and draft['text_content']:
                        continue
                        
                    for key in source_keys:
                        if key in draft:
                            draft['text_content'] = draft.pop(key)
                            modified = True
                            break
                
                if modified:
                    new_json = json.dumps(content)
                    cursor.execute("UPDATE campaigns SET content_json = ? WHERE id = ?", (new_json, campaign_id))
                    updated_count += 1
                    print(f"Migrated campaign {campaign_id}")
        
        except Exception as e:
            print(f"Error migrating {campaign_id}: {e}")

    conn.commit()
    conn.close()
    print(f"--- Migration Complete. Updated {updated_count} campaigns. ---")

if __name__ == "__main__":
    migrate()
