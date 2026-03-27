terraform {
  backend "gcs" {
    bucket = "marketing-agent-01-491314-tfstate"
    prefix = "terraform/state"
  }
}
