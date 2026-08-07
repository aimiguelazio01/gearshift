using System;
using System.Diagnostics;
using System.IO;

namespace GearShift
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "GearShift — Workshop & Arduino NFC Launcher";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==========================================================================");
            Console.WriteLine("   GearShift — Starting Workshop Management & Arduino Hardware Bridge");
            Console.WriteLine("==========================================================================");
            Console.ResetColor();
            Console.WriteLine();

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string nfcServerPath = Path.Combine(baseDir, "nfc_v01", "server.py");

            // 1. Start Python NFC Studio Server if present
            if (File.Exists(nfcServerPath))
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[1/2] Starting Arduino NFC Server (http://localhost:3001)...");
                Console.ResetColor();

                ProcessStartInfo pyPsi = new ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = "\"" + nfcServerPath + "\"",
                    UseShellExecute = true,
                    CreateNoWindow = false
                };
                try
                {
                    Process.Start(pyPsi);
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine(" -> Arduino NFC Server launched on port 3001.");
                    Console.ResetColor();
                }
                catch (Exception ex)
                {
                    Console.WriteLine(" -> Could not start python server: " + ex.Message);
                }
            }

            // 2. Start Next.js Development Server
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("[2/2] Starting GearShift Web App (http://localhost:3000)...");
            Console.ResetColor();

            ProcessStartInfo npmPsi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c npm run dev",
                WorkingDirectory = baseDir,
                UseShellExecute = true,
                CreateNoWindow = false
            };

            try
            {
                Process.Start(npmPsi);
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine(" -> GearShift Web App launching. Opening http://localhost:3000 in browser...");
                Console.ResetColor();

                System.Threading.Thread.Sleep(3000);
                Process.Start("http://localhost:3000");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Could not start npm dev server: " + ex.Message);
                Console.ResetColor();
            }

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("All services started! You can close this launcher window at any time.");
            Console.ResetColor();
            Console.WriteLine("\nPress any key to exit launcher...");
            try { Console.ReadKey(); } catch { }
        }
    }
}
