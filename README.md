# X-Call Frontend

A modern, full-featured Angular frontend application for managing autonomous voice assistants, inspired by VAPI.ai design.

## 🚀 Features

- **Modern Angular Architecture**: Built with Angular 18+ using standalone components
- **Dark Theme Design**: Beautiful dark theme with interactive particle network background
- **Authentication System**: Complete login/logout with JWT token management
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Type Safety**: Full TypeScript implementation with strict typing
- **Error Handling**: Global error handling with user-friendly messages
- **HTTP Interceptors**: Automatic token injection and error handling
- **Route Guards**: Protected routes with authentication guards
- **Material Design**: Angular Material components for consistent UI

## 🛠️ Tech Stack

- **Angular 18+** - Frontend framework
- **TypeScript** - Type-safe JavaScript
- **Angular Material** - UI component library
- **RxJS** - Reactive programming
- **SCSS** - Enhanced CSS with variables and mixins
- **Standalone Components** - Modern Angular architecture

## 📁 Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── services/          # Core services (Auth, API)
│   │   ├── guards/            # Route guards
│   │   └── interceptors/      # HTTP interceptors
│   ├── features/
│   │   ├── auth/              # Authentication features
│   │   └── dashboard/         # Dashboard features
│   ├── shared/
│   │   └── components/        # Reusable components
│   └── layout/                # Layout components
├── assets/                    # Static assets
├── environments/              # Environment configurations
└── styles.scss               # Global styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:4200`

### Build for Production

```bash
npm run build
```

## 🔐 Authentication

The application includes a complete authentication system:

- **Login Page**: Email/password authentication with social login options
- **JWT Token Management**: Automatic token storage and refresh
- **Route Protection**: Guards to protect authenticated routes
- **API Integration**: Ready to connect to your backend API

### API Endpoint

The login component is configured to work with:
```
POST http://localhost:8000/api/v1/auth/login
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "yourpassword123"
}
```

## 🎨 Design System

### Color Palette

- **Primary**: `#00d4aa` (Teal)
- **Background**: `#0a0a0a` (Dark)
- **Surface**: `#1a1a1a` (Dark Gray)
- **Text Primary**: `#ffffff` (White)
- **Text Secondary**: `#b0b0b0` (Light Gray)

### Typography

- **Font Family**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 Development

### Code Quality

- **TypeScript Strict Mode**: Enabled for type safety
- **ESLint**: Code linting and formatting
- **SCSS**: Organized styles with CSS variables
- **Component Architecture**: Standalone components for better tree-shaking

### Best Practices

- ✅ Modular, scalable, and testable code
- ✅ SOLID principles and clean architecture
- ✅ Type annotations and meaningful naming
- ✅ Error handling and logging
- ✅ Performance optimization
- ✅ Security best practices
- ✅ Responsive design
- ✅ Accessibility considerations

## 🚀 Deployment

The application is ready for deployment to any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: Connect your repository
- **AWS S3**: Upload the `dist/` folder
- **Docker**: Use the included Dockerfile

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.
