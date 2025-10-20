# Technical Design Document

## Architecture Overview

The TODO application follows a serverless architecture pattern using AWS services. The system consists of a React frontend hosted on S3/CloudFront, API Gateway for HTTP endpoints, Lambda functions for business logic, and DynamoDB for data persistence.

## System Architecture

```
[Frontend (React)] → [CloudFront] → [API Gateway] → [Lambda Functions] → [DynamoDB]
```

## AWS Services

### Frontend
- **Amazon S3**: Static website hosting for React application
- **Amazon CloudFront**: CDN for global content delivery and HTTPS termination

### Backend
- **Amazon API Gateway**: RESTful API endpoints with CORS support
- **AWS Lambda**: Serverless compute for business logic (Node.js runtime)
- **Amazon DynamoDB**: NoSQL database for TODO item storage

### Infrastructure
- **AWS CDK**: Infrastructure as Code for deployment and resource management

## Database Design

### DynamoDB Table: `todos`
- **Partition Key**: `id` (String) - UUID for each TODO item
- **Attributes**:
  - `description` (String) - Task description
  - `status` (String) - "pending" or "completed"
  - `createdAt` (String) - ISO timestamp
  - `updatedAt` (String) - ISO timestamp

## API Design

### Base URL: `https://api.{domain}/v1`

### Endpoints

#### GET /todos
- **Purpose**: Retrieve all TODO items
- **Response**: Array of TODO objects
- **Status Codes**: 200 (success), 500 (server error)

#### POST /todos
- **Purpose**: Create new TODO item
- **Request Body**: `{ "description": "string" }`
- **Response**: Created TODO object
- **Status Codes**: 201 (created), 400 (bad request), 500 (server error)

#### PUT /todos/{id}
- **Purpose**: Update TODO item status
- **Request Body**: `{ "status": "pending|completed" }`
- **Response**: Updated TODO object
- **Status Codes**: 200 (success), 404 (not found), 400 (bad request), 500 (server error)

#### DELETE /todos/{id}
- **Purpose**: Delete TODO item
- **Response**: Empty body
- **Status Codes**: 204 (no content), 404 (not found), 500 (server error)

## Lambda Functions

### getTodos
- **Runtime**: Node.js 18.x
- **Purpose**: Retrieve all TODO items from DynamoDB
- **Memory**: 128 MB
- **Timeout**: 10 seconds

### createTodo
- **Runtime**: Node.js 18.x
- **Purpose**: Create new TODO item in DynamoDB
- **Memory**: 128 MB
- **Timeout**: 10 seconds

### updateTodo
- **Runtime**: Node.js 18.x
- **Purpose**: Update TODO item status in DynamoDB
- **Memory**: 128 MB
- **Timeout**: 10 seconds

### deleteTodo
- **Runtime**: Node.js 18.x
- **Purpose**: Delete TODO item from DynamoDB
- **Memory**: 128 MB
- **Timeout**: 10 seconds

## Frontend Design

### Technology Stack
- **React**: Component-based UI framework
- **CSS**: Responsive styling with mobile-first approach
- **Fetch API**: HTTP client for API communication

### Component Structure
```
App
├── TodoList
│   ├── TodoItem
│   └── AddTodo
└── ErrorBoundary
```

### State Management
- React hooks (useState, useEffect) for local state management
- No external state management library required for MVP

## Security Considerations

### API Gateway
- CORS configuration for frontend domain
- Request validation for input sanitization
- Rate limiting to prevent abuse

### Lambda Functions
- Minimal IAM permissions (principle of least privilege)
- Input validation and sanitization
- Error handling without sensitive information exposure

### DynamoDB
- Encryption at rest enabled
- Access restricted to Lambda execution roles

## Deployment Strategy

### CDK Stack Components
1. **DynamoDB Table**: TODO items storage
2. **Lambda Functions**: Business logic handlers
3. **API Gateway**: REST API with Lambda integrations
4. **S3 Bucket**: Static website hosting
5. **CloudFront Distribution**: CDN with S3 origin

### Environment Configuration
- Single environment (production) for MVP
- Environment variables for API endpoints
- No CI/CD pipeline (manual deployment via CDK)

## Performance Considerations

### DynamoDB
- On-demand billing mode for variable workloads
- Single table design for simplicity
- No global secondary indexes required

### Lambda
- Cold start optimization through minimal dependencies
- Shared database connection handling
- Appropriate memory allocation for workload

### Frontend
- Static asset optimization
- CloudFront caching for global performance
- Minimal bundle size with tree shaking