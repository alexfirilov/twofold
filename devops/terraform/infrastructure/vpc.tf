resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr_block

  tags = {
    Name = "${terraform.workspace}-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.subnet_cidr_block
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${terraform.workspace}-public-subnet"
    Type = "Public"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${terraform.workspace}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0" # Route all traffic to the Internet Gateway
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "${terraform.workspace}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Get availability zones for the current region
data "aws_availability_zones" "available" {
  state = "available"
}

# Private subnets for RDS (in different AZs for multi-AZ support)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_a_cidr_block
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${terraform.workspace}-private-subnet-a"
    Type = "Private"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_b_cidr_block
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${terraform.workspace}-private-subnet-b"
    Type = "Private"
  }
}

# Route table for private subnets (no internet gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${terraform.workspace}-private-rt"
  }
}

# Associate private subnets with private route table
resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}
