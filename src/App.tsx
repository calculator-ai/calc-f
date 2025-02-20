import { createBrowserRouter, RouterProvider } from "react-router-dom";
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

import Home from "@/screens/home";
import '@/index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
]);

const App = () => {
  return (
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>
  );
};

export default App;
