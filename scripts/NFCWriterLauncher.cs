using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;

namespace GearShift
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "GearShift — NFC Card Writer Studio Launcher";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==========================================================================");
            Console.WriteLine("   GearShift — NFC Card Writer Studio Launcher");
            Console.WriteLine("   Target URL: http://localhost:3001");
            Console.WriteLine("==========================================================================");
            Console.ResetColor();
            Console.WriteLine();

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // Check for nfc_v01/server.py in current directory or parent directory
            string nfcServerPath = Path.Combine(baseDir, "nfc_v01", "server.py");
            string nfcWorkDir = Path.Combine(baseDir, "nfc_v01");

            if (!File.Exists(nfcServerPath))
            {
                // Try relative to workspace root if executed from scripts/
                string parentNfcServer = Path.Combine(baseDir, "..", "nfc_v01", "server.py");
                if (File.Exists(parentNfcServer))
                {
                    nfcServerPath = Path.GetFullPath(parentNfcServer);
                    nfcWorkDir = Path.GetFullPath(Path.Combine(baseDir, "..", "nfc_v01"));
                }
            }

            // Check if port 3001 is already accepting connections
            bool isAlreadyRunning = false;
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult ar = client.BeginConnect("127.0.0.1", 3001, null, null);
                    bool success = ar.AsyncWaitHandle.WaitOne(500);
                    if (success && client.Connected)
                    {
                        isAlreadyRunning = true;
                    }
                }
            }
            catch { }

            if (isAlreadyRunning)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[INFO] NFC Card Writer Studio Server is already active on http://localhost:3001.");
                Console.ResetColor();
            }
            else if (File.Exists(nfcServerPath))
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[1/2] Launching Python NFC Server (http://localhost:3001)...");
                Console.ResetColor();

                ProcessStartInfo pyPsi = new ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = "\"" + nfcServerPath + "\"",
                    WorkingDirectory = nfcWorkDir,
                    UseShellExecute = true,
                    CreateNoWindow = false
                };

                try
                {
                    Process.Start(pyPsi);
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine(" -> Arduino NFC Server process started successfully.");
                    Console.ResetColor();
                    System.Threading.Thread.Sleep(1500);
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("[ERROR] Could not start Python NFC server: " + ex.Message);
                    Console.WriteLine("Please make sure Python is installed and in your system PATH.");
                    Console.ResetColor();
                }
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[WARNING] nfc_v01/server.py not found at: " + nfcServerPath);
                Console.WriteLine("Will attempt opening http://localhost:3001 directly in browser...");
                Console.ResetColor();
            }

            // Open http://localhost:3001 in default browser
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("[2/2] Opening http://localhost:3001 in your browser...");
            Console.ResetColor();

            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "http://localhost:3001",
                    UseShellExecute = true
                });
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine(" -> Browser window opened for NFC Card Writer Studio!");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Failed to launch default web browser: " + ex.Message);
                Console.ResetColor();
            }

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==========================================================================");
            Console.WriteLine("NFC Studio is running at http://localhost:3001");
            Console.WriteLine("Press any key to close this launcher window...");
            Console.WriteLine("==========================================================================");
            Console.ResetColor();

            try { Console.ReadKey(); } catch { }
        }
    }
}
